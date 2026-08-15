package dev.mineyapping;

import com.google.gson.Gson;
import com.mojang.blaze3d.platform.InputConstants;
import com.mojang.brigadier.arguments.StringArgumentType;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.SourceDataLine;
import javax.sound.sampled.TargetDataLine;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.function.Consumer;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.ClientCommands;
import net.fabricmc.loader.api.FabricLoader;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.message.v1.ClientSendMessageEvents;
import net.fabricmc.fabric.api.event.player.AttackEntityCallback;
import net.fabricmc.fabric.api.event.player.UseEntityCallback;
import net.minecraft.ChatFormatting;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.entity.Mob;
import net.minecraft.world.phys.EntityHitResult;
import net.minecraft.world.phys.Vec3;
import org.lwjgl.glfw.GLFW;

public class MineYappingClient implements ClientModInitializer {
	private static final double LISTEN_RADIUS = 8.0;
	private static final double DEFAULT_SPEECH_CHANCE = 0.5;
	private static final int SPEECH_CHECK_TICKS = 20 * 30;
	private static final String DEFAULT_SERVER_URL = "https://mine-yapper.com/api/converse";
	private static final KeyMapping.Category CATEGORY =
			KeyMapping.Category.register(Identifier.fromNamespaceAndPath("mineyapping", "conversation"));
	private static final HttpClient HTTP = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(5))
			.build();
	private static final Gson GSON = new Gson();

	private KeyMapping talkKey;
	private boolean wasDown;
	private VoiceRecording recording;
	private VoiceConversation voiceConversation;
	private MobTarget talkingTo;
	private LivingEntity talkingEntity;
	private String apiKey = "";
	private URI conversationEndpoint = URI.create(DEFAULT_SERVER_URL);
	private double speechChance = DEFAULT_SPEECH_CHANCE;
	private int speechCheckTicks;

	@Override
	public void onInitializeClient() {
		ModConfig config = loadConfig();
		apiKey = config.apiKey();
		conversationEndpoint = URI.create(config.serverUrl());
		speechChance = config.speechChance();
		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> dispatcher.register(
				ClientCommands.literal("login")
						.then(ClientCommands.argument("token", StringArgumentType.string()).executes(context -> {
							String token = StringArgumentType.getString(context, "token");
							try {
								saveConfig(token);
								apiKey = token;
								context.getSource().sendFeedback(Component.literal("MineYapping login saved."));
								return 1;
							} catch (Exception exception) {
								context.getSource().sendError(Component.literal("Could not save login: " + exception.getMessage()));
								return 0;
							}
						}))));
		talkKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
				"key.mineyapping.talk",
				InputConstants.Type.KEYSYM,
				GLFW.GLFW_KEY_V,
				CATEGORY));

		ClientTickEvents.END_CLIENT_TICK.register(client -> {
			boolean down = talkKey.isDown();
			if (down != wasDown) {
				wasDown = down;
				if (down) onTalkStart(client);
				else onTalkStop(client);
			}
			spontaneousSpeech(client);
		});
		ClientSendMessageEvents.ALLOW_CHAT.register(this::onChat);
		UseEntityCallback.EVENT.register((player, level, hand, entity, hit) ->
				level.isClientSide() ? mobInteraction(entity, "interacted with you") : InteractionResult.PASS);
		AttackEntityCallback.EVENT.register((player, level, hand, entity, hit) ->
				level.isClientSide() ? mobInteraction(entity, "attacked you") : InteractionResult.PASS);
	}

	private boolean onChat(String message) {
		Minecraft client = Minecraft.getInstance();
		if (client.level == null || client.player == null) return true;
		LivingEntity entity = findTarget(client);
		if (entity == null) return true;
		try {
			say(client, ChatFormatting.GRAY, "Thinking...");
			sendConversation(client, target(client, entity), message);
		} catch (Exception exception) {
			say(client, ChatFormatting.RED, "Conversation failed: " + exception.getMessage());
		}
		return false;
	}

	private InteractionResult mobInteraction(Entity entity, String action) {
		Minecraft client = Minecraft.getInstance();
		if (entity instanceof Mob mob && !apiKey.isBlank() && client.level != null && client.player != null) {
			try {
				sendConversation(client, target(client, mob),
						client.player.getName().getString() + " just " + action + ". React naturally.");
			} catch (Exception exception) {
				say(client, ChatFormatting.RED, "Conversation failed: " + exception.getMessage());
			}
		}
		return InteractionResult.PASS;
	}

	private void spontaneousSpeech(Minecraft client) {
		if (++speechCheckTicks < SPEECH_CHECK_TICKS) return;
		speechCheckTicks = 0;
		if (apiKey.isBlank() || recording != null || client.level == null || client.player == null
				|| Math.random() >= speechChance) return;
		List<Mob> nearby = client.level.getEntitiesOfClass(
				Mob.class,
				client.player.getBoundingBox().inflate(LISTEN_RADIUS),
				LivingEntity::isAlive);
		if (nearby.isEmpty()) return;
		Mob mob = nearby.get((int) (Math.random() * nearby.size()));
		try {
			sendConversation(client, target(client, mob),
					"Start a brief, natural conversation with " + client.player.getName().getString() + ".");
		} catch (Exception exception) {
			say(client, ChatFormatting.RED, "Spontaneous conversation failed: " + exception.getMessage());
		}
	}

	private void onTalkStart(Minecraft client) {
		if (client.level == null || client.player == null || recording != null) return;
		warmConnection();
		LivingEntity target = findTarget(client);
		if (target == null) {
			say(client, ChatFormatting.YELLOW,
					"Look at a mob or move within " + (int) LISTEN_RADIUS + " blocks.");
			return;
		}

		try {
			talkingTo = target(client, target);
			talkingEntity = target;
			voiceConversation = new VoiceConversation(client, talkingTo);
			recording = VoiceRecording.start(voiceConversation::sendAudio);
			say(client, ChatFormatting.AQUA, "Listening to " + talkingTo.entityName() + "...");
		} catch (Exception exception) {
			if (voiceConversation != null) voiceConversation.cancel();
			voiceConversation = null;
			talkingTo = null;
			talkingEntity = null;
			say(client, ChatFormatting.RED, "Microphone unavailable: " + exception.getMessage());
		}
	}

	private void onTalkStop(Minecraft client) {
		if (recording == null || talkingTo == null || talkingEntity == null || voiceConversation == null) return;
		VoiceRecording finished = recording;
		MobTarget target = talkingTo;
		LivingEntity entity = talkingEntity;
		VoiceConversation conversation = voiceConversation;
		recording = null;
		talkingTo = null;
		talkingEntity = null;
		voiceConversation = null;
		try {
			int audioBytes = finished.stop();
			if (audioBytes < 1_000) {
				conversation.cancel();
				say(client, ChatFormatting.YELLOW, "Hold V a little longer so I can hear you.");
				return;
			}
			acknowledge(client, entity);
			say(client, ChatFormatting.GRAY, "Thinking...");
			conversation.commit();
		} catch (Exception exception) {
			conversation.cancel();
			say(client, ChatFormatting.RED, "Recording failed: " + exception.getMessage());
		}
	}

	private LivingEntity findTarget(Minecraft client) {
		if (client.hitResult instanceof EntityHitResult hit
				&& hit.getEntity() instanceof LivingEntity entity
				&& entity.isAlive()
				&& client.player.distanceTo(entity) <= LISTEN_RADIUS) {
			return entity;
		}
		List<LivingEntity> nearby = client.level.getEntitiesOfClass(
				LivingEntity.class,
				client.player.getBoundingBox().inflate(LISTEN_RADIUS),
				entity -> entity != client.player && entity.isAlive());
		return nearby.stream().min(Comparator.comparingDouble(client.player::distanceTo)).orElse(null);
	}

	private MobTarget target(Minecraft client, LivingEntity entity) {
		return new MobTarget(
				entity.getUUID().toString(),
				EntityType.getKey(entity.getType()).toString(),
				entity.getName().getString(),
				client.player.getName().getString(),
				client.level.dimension().identifier().toString(),
				String.format("%.1f/%.1f", entity.getHealth(), entity.getMaxHealth()),
				entity.getX(),
				entity.getY(),
				entity.getZ());
	}

	private void sendConversation(Minecraft client, MobTarget target, String text) throws Exception {
		if (apiKey.isBlank()) {
			throw new IllegalStateException("Run /login <token> with your dashboard API key");
		}
		String boundary = "MineYapping-" + System.nanoTime();
		HttpRequest request = HttpRequest.newBuilder(conversationEndpoint)
				.timeout(Duration.ofSeconds(45))
				.header("x-api-key", apiKey)
				.header("Content-Type", "multipart/form-data; boundary=" + boundary)
				.POST(HttpRequest.BodyPublishers.ofByteArray(multipart(boundary, target, text)))
				.build();
		HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofInputStream()).whenComplete((response, failure) ->
				Thread.ofVirtual().name("mineyapping-http").start(() -> handleResponse(client, target, response, failure)));
	}

	private ModConfig loadConfig() {
		Path path = FabricLoader.getInstance().getConfigDir().resolve("mine-yapping.json");
		try {
			if (Files.notExists(path)) {
				Files.writeString(path, "{\n  \"apiKey\": \"\",\n  \"serverUrl\": \"" + DEFAULT_SERVER_URL
						+ "\",\n  \"speechChance\": " + DEFAULT_SPEECH_CHANCE + "\n}\n", StandardCharsets.UTF_8);
				return new ModConfig("", DEFAULT_SERVER_URL, DEFAULT_SPEECH_CHANCE);
			}
			ModConfig config = GSON.fromJson(Files.readString(path), ModConfig.class);
			return new ModConfig(
					config == null || config.apiKey() == null ? "" : config.apiKey().trim(),
					config == null || config.serverUrl() == null || config.serverUrl().isBlank()
							? DEFAULT_SERVER_URL
							: config.serverUrl().trim(),
					config == null || config.speechChance() == null || !Double.isFinite(config.speechChance())
							? DEFAULT_SPEECH_CHANCE
							: Math.max(0.0, Math.min(1.0, config.speechChance())));
		} catch (Exception exception) {
			System.err.println("Could not read " + path + ": " + exception.getMessage());
			return new ModConfig("", DEFAULT_SERVER_URL, DEFAULT_SPEECH_CHANCE);
		}
	}

	private void saveConfig(String token) throws Exception {
		Path path = FabricLoader.getInstance().getConfigDir().resolve("mine-yapping.json");
		Files.writeString(
				path,
				GSON.toJson(new ModConfig(token, conversationEndpoint.toString(), speechChance)),
				StandardCharsets.UTF_8);
	}

	private void warmConnection() {
		HttpRequest request = HttpRequest.newBuilder(conversationEndpoint.resolve("/"))
				.timeout(Duration.ofSeconds(3))
				.GET()
				.build();
		HTTP.sendAsync(request, HttpResponse.BodyHandlers.discarding()).exceptionally(ignored -> null);
	}

	private void acknowledge(Minecraft client, LivingEntity entity) {
		if (client.player == null || !entity.isAlive()) return;
		if (entity instanceof Mob mob) {
			mob.lookAt(client.player, 30.0F, 30.0F);
			mob.playAmbientSound();
		}
	}

	private void handleResponse(
			Minecraft client,
			MobTarget target,
			HttpResponse<InputStream> response,
			Throwable failure) {
		boolean handedOff = false;
		try {
			if (failure != null) throw new IllegalStateException(failure.getMessage(), failure);
			if (response.statusCode() != 200) {
				String body = new String(response.body().readAllBytes(), StandardCharsets.UTF_8);
				throw new IllegalStateException("Conversation failed (" + response.statusCode() + "): " + body);
			}
			String transcript = decodeHeader(response, "X-MineYapping-Transcript");
			String reply = decodeHeader(response, "X-MineYapping-Reply");
			client.execute(() -> {
				say(client, ChatFormatting.DARK_GRAY, transcript);
				say(client, ChatFormatting.GOLD, target.entityName() + ": " + reply);
				play(response.body(), target);
			});
			handedOff = true;
		} catch (Exception exception) {
			client.execute(() -> say(client, ChatFormatting.RED, "Conversation failed: " + exception.getMessage()));
		} finally {
			if (!handedOff && response != null) {
				try {
					response.body().close();
				} catch (Exception ignored) {
				}
			}
		}
	}

	private static String decodeHeader(HttpResponse<?> response, String name) {
		String value = response.headers().firstValue(name)
				.orElseThrow(() -> new IllegalStateException("Server response is missing " + name));
		return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
	}

	private void play(InputStream audio, MobTarget target) {
		Thread.ofVirtual().name("mineyapping-tts").start(() -> {
			try (audio; PcmPlayer player = new PcmPlayer(playbackGains(target))) {
				byte[] chunk = new byte[4_096];
				for (int read; (read = audio.read(chunk)) != -1; ) {
					player.write(chunk, read);
				}
			} catch (Exception exception) {
				Minecraft.getInstance().execute(() -> say(
						Minecraft.getInstance(), ChatFormatting.RED, "Speech playback failed: " + exception.getMessage()));
			}
		});
	}

	private PlaybackGains playbackGains(MobTarget target) {
		Minecraft client = Minecraft.getInstance();
		if (client.player == null) return new PlaybackGains(1.0, 1.0);
		Vec3 offset = new Vec3(
				target.x() - client.player.getX(),
				target.y() - client.player.getY(),
				target.z() - client.player.getZ());
		double distance = offset.length();
		double pan = distance == 0.0
				? 0.0
				: offset.normalize().dot(client.player.getLookAngle().cross(new Vec3(0.0, 1.0, 0.0)).normalize());
		double gain = Math.max(0.2, 1.0 - distance / (LISTEN_RADIUS * 1.5));
		return new PlaybackGains(
				gain * (pan > 0.0 ? 1.0 - pan : 1.0),
				gain * (pan < 0.0 ? 1.0 + pan : 1.0));
	}

	private URI websocketEndpoint(MobTarget target) {
		String endpoint = conversationEndpoint.toString().replaceFirst("^http", "ws");
		if (endpoint.endsWith("/")) endpoint = endpoint.substring(0, endpoint.length() - 1);
		String query = "entityId=" + encoded(target.entityId())
				+ "&entityType=" + encoded(target.entityType())
				+ "&entityName=" + encoded(target.entityName())
				+ "&playerName=" + encoded(target.playerName())
				+ "&dimension=" + encoded(target.dimension())
				+ "&health=" + encoded(target.health());
		return URI.create(endpoint + "/stream?" + query);
	}

	private static String encoded(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	private static byte[] multipart(String boundary, MobTarget target, String text) throws Exception {
		ByteArrayOutputStream body = new ByteArrayOutputStream();
		field(body, boundary, "entityId", target.entityId());
		field(body, boundary, "entityType", target.entityType());
		field(body, boundary, "entityName", target.entityName());
		field(body, boundary, "playerName", target.playerName());
		field(body, boundary, "dimension", target.dimension());
		field(body, boundary, "health", target.health());
		field(body, boundary, "text", text);
		body.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
		return body.toByteArray();
	}

	private static void field(ByteArrayOutputStream body, String boundary, String name, String value)
			throws Exception {
		body.write(("--" + boundary + "\r\n"
				+ "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n"
				+ value + "\r\n").getBytes(StandardCharsets.UTF_8));
	}

	private void say(Minecraft client, ChatFormatting color, String message) {
		if (client.player != null) {
			client.player.sendSystemMessage(Component.literal(message).withStyle(color));
		}
	}

	private record MobTarget(
			String entityId,
			String entityType,
			String entityName,
			String playerName,
			String dimension,
			String health,
			double x,
			double y,
			double z) {}

	private record ModConfig(String apiKey, String serverUrl, Double speechChance) {}

	private record StreamEvent(String type, String value) {}

	private record PlaybackGains(double left, double right) {}

	private final class VoiceConversation implements WebSocket.Listener {
		private final Minecraft client;
		private final MobTarget target;
		private final CompletableFuture<WebSocket> socket;
		private final StringBuilder textMessage = new StringBuilder();
		private CompletableFuture<?> sends;
		private PcmPlayer player;

		private VoiceConversation(Minecraft client, MobTarget target) {
			this.client = client;
			this.target = target;
			this.socket = HTTP.newWebSocketBuilder()
					.connectTimeout(Duration.ofSeconds(5))
					.header("x-api-key", apiKey)
					.buildAsync(websocketEndpoint(target), this);
			this.sends = socket;
			this.socket.whenComplete((webSocket, failure) -> {
				if (failure == null) return;
				client.execute(() -> {
					if (voiceConversation != this) return;
					VoiceRecording failedRecording = recording;
					recording = null;
					talkingTo = null;
					talkingEntity = null;
					voiceConversation = null;
					if (failedRecording != null) Thread.ofVirtual().start(() -> {
						try {
							failedRecording.stop();
						} catch (Exception ignored) {
						}
					});
					say(client, ChatFormatting.RED, "Conversation failed: " + failure.getMessage());
				});
			});
		}

		@Override
		public void onOpen(WebSocket webSocket) {
			webSocket.request(1);
		}

		@Override
		public CompletionStage<?> onText(WebSocket webSocket, CharSequence data, boolean last) {
			textMessage.append(data);
			if (last) {
				StreamEvent event = GSON.fromJson(textMessage.toString(), StreamEvent.class);
				textMessage.setLength(0);
				String type = event == null ? null : event.type();
				if ("transcript".equals(type)) {
					client.execute(() -> say(client, ChatFormatting.DARK_GRAY, event.value()));
				} else if ("reply".equals(type)) {
					client.execute(() -> say(client, ChatFormatting.GOLD,
							target.entityName() + ": " + event.value()));
				} else if ("error".equals(type)) {
					client.execute(() -> say(client, ChatFormatting.RED, "Conversation failed: " + event.value()));
				} else if ("done".equals(type)) {
					closePlayer();
				}
			}
			webSocket.request(1);
			return null;
		}

		@Override
		public CompletionStage<?> onBinary(WebSocket webSocket, ByteBuffer data, boolean last) {
			try {
				if (player == null) player = new PcmPlayer(playbackGains(target));
				byte[] chunk = new byte[data.remaining()];
				data.get(chunk);
				player.write(chunk, chunk.length);
			} catch (Exception exception) {
				onError(webSocket, exception);
			}
			webSocket.request(1);
			return null;
		}

		@Override
		public CompletionStage<?> onClose(WebSocket webSocket, int statusCode, String reason) {
			closePlayer();
			return null;
		}

		@Override
		public void onError(WebSocket webSocket, Throwable error) {
			webSocket.abort();
			closePlayer();
			client.execute(() -> say(client, ChatFormatting.RED,
					"Conversation failed: " + error.getMessage()));
		}

		synchronized void sendAudio(byte[] audio) {
			sends = sends.thenCompose(ignored -> socket.thenCompose(
					webSocket -> webSocket.sendBinary(ByteBuffer.wrap(audio), true)));
		}

		synchronized void commit() {
			sends = sends.thenCompose(ignored -> socket.thenCompose(
					webSocket -> webSocket.sendText("commit", true)));
		}

		synchronized void cancel() {
			socket.thenAccept(webSocket -> webSocket.sendText("cancel", true)
					.whenComplete((sent, failure) -> webSocket.abort()));
		}

		private void closePlayer() {
			if (player != null) {
				player.close();
				player = null;
			}
		}
	}

	private static final class PcmPlayer implements AutoCloseable {
		private static final AudioFormat FORMAT = new AudioFormat(24_000, 16, 2, true, false);
		private final PlaybackGains gains;
		private final SourceDataLine line;
		private int pendingByte = -1;

		private PcmPlayer(PlaybackGains gains) throws Exception {
			this.gains = gains;
			DataLine.Info info = new DataLine.Info(SourceDataLine.class, FORMAT);
			if (!AudioSystem.isLineSupported(info))
				throw new IllegalStateException("24 kHz stereo playback is not supported");
			line = (SourceDataLine) AudioSystem.getLine(info);
			line.open(FORMAT, 4_800);
			line.start();
		}

		void write(byte[] mono, int length) {
			byte[] stereo = new byte[((length + (pendingByte < 0 ? 0 : 1)) / 2) * 4];
			int input = 0;
			int output = 0;
			if (pendingByte >= 0 && length > 0) {
				output = stereoSample(stereo, output, pendingByte, mono[input++] & 0xff);
				pendingByte = -1;
			}
			while (input + 1 < length) {
				output = stereoSample(stereo, output, mono[input++] & 0xff, mono[input++] & 0xff);
			}
			if (input < length) pendingByte = mono[input] & 0xff;
			if (output > 0) line.write(stereo, 0, output);
		}

		private int stereoSample(byte[] output, int index, int low, int high) {
			short mono = (short) (low | high << 8);
			short left = (short) Math.round(mono * gains.left());
			short right = (short) Math.round(mono * gains.right());
			output[index++] = (byte) left;
			output[index++] = (byte) (left >> 8);
			output[index++] = (byte) right;
			output[index++] = (byte) (right >> 8);
			return index;
		}

		@Override
		public void close() {
			line.drain();
			line.close();
		}
	}

	private static final class VoiceRecording {
		private static final AudioFormat FORMAT = new AudioFormat(24_000, 16, 1, true, false);
		private final TargetDataLine line;
		private final Thread thread;
		private volatile int bytesSent;
		private volatile boolean active = true;

		private VoiceRecording(TargetDataLine line, Consumer<byte[]> sink) {
			this.line = line;
			thread = Thread.ofVirtual().name("mineyapping-microphone").start(() -> {
				byte[] buffer = new byte[960];
				while (active) {
					int read = line.read(buffer, 0, buffer.length);
					if (read > 0) {
						bytesSent += read;
						sink.accept(Arrays.copyOf(buffer, read));
					}
				}
			});
		}

		static VoiceRecording start(Consumer<byte[]> sink) throws Exception {
			DataLine.Info info = new DataLine.Info(TargetDataLine.class, FORMAT);
			if (!AudioSystem.isLineSupported(info)) throw new IllegalStateException("24 kHz microphone not supported");
			TargetDataLine line = (TargetDataLine) AudioSystem.getLine(info);
			line.open(FORMAT);
			line.start();
			return new VoiceRecording(line, sink);
		}

		int stop() throws Exception {
			active = false;
			line.stop();
			line.close();
			thread.join(1_000);
			return bytesSent;
		}
	}
}
