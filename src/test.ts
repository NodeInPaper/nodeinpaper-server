import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { $plugin, $class }, onDisconnect, registerCommand, registerEvent }) => {
  console.log("Registered!");
  let interval = setInterval(async () => {
    const [onlinePlayers] = await $plugin.getServer().getOnlinePlayers().$get();

    onlinePlayers.forEach(async (player: any) => {
      const [res] = await player.$get(
        {
          uuid: (p: any) => p.getUniqueId().toString(),
          x: (p: any) => p.getLocation().getX(),
          y: (p: any) => p.getLocation().getY(),
          z: (p: any) => p.getLocation().getZ(),
        }
      );

      player.sendActionBar(`X: ${res.x.toFixed(2)} Y: ${res.y.toFixed(2)} Z: ${res.z.toFixed(2)}`).$run();
    });
  }, 100);

  registerCommand({
    name: "nodejs-test",
    async onExecute(sender, label, ...args) {
      const [playerName] = await sender.getName().$get();
      console.log("Command executed!");
      await sender.sendPlainMessage(`Hello from node.js! Your name: ${playerName}`).$run();
      sender.$unRef();
    }
  })

  registerEvent({
    name: "org.bukkit.event.player.PlayerToggleSneakEvent",
    async onExecute(event) {
      const [player] = await event.getPlayer().$get();
      const [isSneaking] = await event.isSneaking().$get();
      console.log(`Player ${await player.getName().$get()} is sneaking: ${isSneaking}`);
      await player.sendPlainMessage(`Sneaking: ${isSneaking}`).$run();
      event.$unRef();
    }
  })

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
    async onExecute(event) {
      const [message] = await event.getMessage().$get();
      const [isCancelled] = await event.isCancelled().$get();
      console.log(`chat is cancelled: ${isCancelled}`);
      console.log(`Message: ${message}`);
      $plugin.getServer().broadcastMessage(`[Chat] ${message}`).$run();
      event.$unRef();
    }
  })

  onDisconnect(() => {
    clearInterval(interval);
  });
});

nip.init();

