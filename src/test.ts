import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { $plugin, $class, $classFromPath }, onDisconnect, registerCommand, registerEvent, connection }) => {
  console.log("Registered!");

  registerEvent({
    name: "org.bukkit.event.player.PlayerChatEvent",
    cancelConditions: {
      and: [
        {
          a: true,
          b: true,
          op: "=="
        }
      ]
    },
    priority: "Low",
    async onExecute(event) {
      const [{ format, message, shouldBypass }] = await event.$get({
        format: (e: any) => e.getFormat(),
        message: (e: any) => e.getMessage(),
        shouldBypass: (e: any) => e.getPlayer().isPermissionSet("aichat.bypass")
      });
      const [player] = await event.getPlayer().$get();
      event.$unRef();

      const [papi] = await $class("me.clip.placeholderapi.PlaceholderAPI").$get();
      // connection.send("LogReference", papi.$refId);
      // return;

      const [text] = await papi.setPlaceholders(player, "papi test - tps: %server_tps_1%, %player_name%").$get();

      console.log(text);
      
      await $plugin.getServer().broadcastMessage(format).$run();
    }
  })
});

nip.init();