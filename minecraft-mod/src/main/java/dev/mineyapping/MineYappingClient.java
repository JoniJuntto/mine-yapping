package dev.mineyapping;

import com.google.gson.Gson;
import com.mojang.blaze3d.platform.InputConstants;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import javax.sound.sampled.AudioFileFormat;
import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioInputStream;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.Clip;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.TargetDataLine;
import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.event.lifecycle.v1.ClientTickEvents;
import net.fabricmc.fabric.api.client.keymapping.v1.KeyMappingHelper;
import net.fabricmc.fabric.api.client.message.v1.ClientSendMessageEvents;
import net.minecraft.ChatFormatting;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.LivingEntity;
import net.minecraft.world.phys.EntityHitResult;
import org.lwjgl.glfw.GLFW;

public class MineYappingClient implements ClientModInitializer {
	private static final double LISTEN_RADIUS = 8.0;
	// ponytail: local endpoint until players need configurable or hosted backends.
	private static final URI CONVERSATION_ENDPOINT = URI.create("https://yapping.arvoitus.com/api/converse");
	private static final KeyMapping.Category CATEGORY =
			KeyMapping.Category.register(Identifier.fromNamespaceAndPath("mineyapping", "conversation"));
	private static final HttpClient HTTP = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(5))
			.build();
	private static final Gson GSON = new Gson();

	private KeyMapping talkKey;
	private boolean wasDown;
	private VoiceRecording recording;
	private MobTarget talkingTo;

	@Override
	public void onInitializeClient() {
		talkKey = KeyMappingHelper.registerKeyMapping(new KeyMapping(
				"key.mineyapping.talk",
				InputConstants.Type.KEYSYM,
				GLFW.GLFW_KEY_V,
				CATEGORY));

		ClientTickEvents.END_CLIENT_TICK.register(client -> {
			boolean down = talkKey.isDown();
			if (down == wasDown) return;
			wasDown = down;
			if (down) onTalkStart(client);
			else onTalkStop(client);
		});
		ClientSendMessageEvents.ALLOW_CHAT.register(this::onChat);
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

	private void onTalkStart(Minecraft client) {
		if (client.level == null || client.player == null || recording != null) return;
		LivingEntity target = findTarget(client);
		if (target == null) {
			say(client, ChatFormatting.YELLOW,
					"Look at a mob or move within " + (int) LISTEN_RADIUS + " blocks.");
			return;
		}

		try {
			recording = VoiceRecording.start();
			talkingTo = target(client, target);
			say(client, ChatFormatting.AQUA, "Listening to " + talkingTo.entityName() + "...");
		} catch (Exception exception) {
			say(client, ChatFormatting.RED, "Microphone unavailable: " + exception.getMessage());
		}
	}

	private void onTalkStop(Minecraft client) {
		if (recording == null || talkingTo == null) return;
		VoiceRecording finished = recording;
		MobTarget target = talkingTo;
		recording = null;
		talkingTo = null;
		try {
			byte[] audio = finished.stop();
			if (audio.length < 1_000) {
				say(client, ChatFormatting.YELLOW, "Hold V a little longer so I can hear you.");
				return;
			}
			say(client, ChatFormatting.GRAY, "Thinking...");
			sendConversation(client, target, audio);
		} catch (Exception exception) {
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
				String.format("%.1f/%.1f", entity.getHealth(), entity.getMaxHealth()));
	}

	private void sendConversation(Minecraft client, MobTarget target, byte[] audio) throws Exception {
		sendConversation(client, target, audio, null);
	}

	private void sendConversation(Minecraft client, MobTarget target, String text) throws Exception {
		sendConversation(client, target, null, text);
	}

	private void sendConversation(Minecraft client, MobTarget target, byte[] audio, String text) throws Exception {
		String boundary = "MineYapping-" + UUID.randomUUID();
		HttpRequest request = HttpRequest.newBuilder(CONVERSATION_ENDPOINT)
				.timeout(Duration.ofSeconds(45))
				.header("Content-Type", "multipart/form-data; boundary=" + boundary)
				.POST(HttpRequest.BodyPublishers.ofByteArray(multipart(boundary, target, audio, text)))
				.build();
		HTTP.sendAsync(request, HttpResponse.BodyHandlers.ofString()).whenComplete((response, failure) ->
				client.execute(() -> {
					if (failure != null) {
						say(client, ChatFormatting.RED, "Conversation failed: " + failure.getMessage());
						return;
					}
					if (response.statusCode() != 200) {
						say(client, ChatFormatting.RED,
								"Conversation failed (" + response.statusCode() + "): " + response.body());
						return;
					}
					ServerReply reply = GSON.fromJson(response.body(), ServerReply.class);
					say(client, ChatFormatting.DARK_GRAY, "You: " + reply.transcript());
					say(client, ChatFormatting.GOLD, target.entityName() + ": " + reply.reply());
					play(reply.audio());
				}));
	}

	private void play(String audio) {
		Thread.ofVirtual().name("mineyapping-tts").start(() -> {
			try (AudioInputStream stream = AudioSystem.getAudioInputStream(
					new ByteArrayInputStream(Base64.getDecoder().decode(audio)))) {
				Clip clip = AudioSystem.getClip();
				clip.addLineListener(event -> {
					if (event.getType() == javax.sound.sampled.LineEvent.Type.STOP) clip.close();
				});
				clip.open(stream);
				clip.start();
			} catch (Exception exception) {
				Minecraft.getInstance().execute(() -> say(
						Minecraft.getInstance(), ChatFormatting.RED, "Speech playback failed: " + exception.getMessage()));
			}
		});
	}

	private static byte[] multipart(String boundary, MobTarget target, byte[] audio, String text) throws Exception {
		ByteArrayOutputStream body = new ByteArrayOutputStream();
		field(body, boundary, "entityId", target.entityId());
		field(body, boundary, "entityType", target.entityType());
		field(body, boundary, "entityName", target.entityName());
		field(body, boundary, "playerName", target.playerName());
		field(body, boundary, "dimension", target.dimension());
		field(body, boundary, "health", target.health());
		if (text != null) {
			field(body, boundary, "text", text);
		} else {
			body.write(("--" + boundary + "\r\n"
					+ "Content-Disposition: form-data; name=\"audio\"; filename=\"speech.wav\"\r\n"
					+ "Content-Type: audio/wav\r\n\r\n").getBytes(StandardCharsets.UTF_8));
			body.write(audio);
		}
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
			String health) {}

	private record ServerReply(String transcript, String reply, String audio) {}

	private static final class VoiceRecording {
		private static final AudioFormat FORMAT = new AudioFormat(16_000, 16, 1, true, false);
		private final TargetDataLine line;
		private final ByteArrayOutputStream audio = new ByteArrayOutputStream();
		private final Thread thread;
		private volatile boolean active = true;

		private VoiceRecording(TargetDataLine line) {
			this.line = line;
			thread = Thread.ofVirtual().name("mineyapping-microphone").start(() -> {
				byte[] buffer = new byte[4_096];
				while (active) {
					int read = line.read(buffer, 0, buffer.length);
					if (read > 0) audio.write(buffer, 0, read);
				}
			});
		}

		static VoiceRecording start() throws Exception {
			DataLine.Info info = new DataLine.Info(TargetDataLine.class, FORMAT);
			if (!AudioSystem.isLineSupported(info)) throw new IllegalStateException("16 kHz microphone not supported");
			TargetDataLine line = (TargetDataLine) AudioSystem.getLine(info);
			line.open(FORMAT);
			line.start();
			return new VoiceRecording(line);
		}

		byte[] stop() throws Exception {
			active = false;
			line.stop();
			line.close();
			thread.join(1_000);
			byte[] raw = audio.toByteArray();
			ByteArrayOutputStream wav = new ByteArrayOutputStream();
			try (AudioInputStream stream = new AudioInputStream(
					new ByteArrayInputStream(raw), FORMAT, raw.length / FORMAT.getFrameSize())) {
				AudioSystem.write(stream, AudioFileFormat.Type.WAVE, wav);
			}
			return wav.toByteArray();
		}
	}
}
