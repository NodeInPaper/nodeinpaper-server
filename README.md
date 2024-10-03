# nodeinpaper-server
NodeInPaper allows you to run node.js code in a Minecraft Java Edition Paper Server. (this project is still in development)

# discord
development server is [here](https://discord.gg/Gk8yruSrak)

# features
- use every node.js feature!
- using async/await
- accessing entire paper api
- accessing custom classeses
- accessing custom classes from other jars
- getting raw values from java objects
- getting java object references (look to example code)
- registering commands
- registering events
- cancelling events
- unrefing objects from memory
- and more!

# todo
- [ ] full typescript support for java objects

# how to use
1. add the latest [nodeinpaper-client plugin](https://github.com/NodeInPaper/nodeinpaper-client/releases) to your paper server
2. add nodeinpaper-server to your node.js project
3. enjoy! (look to example code)

# example api
example code is below.
```ts
import { createNIPServer } from "nodeinpaper-server";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { $plugin, $class, $classFromPath }, onDisconnect, registerCommand, registerEvent }) => {
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
      sender.$unRef(); // don't forget to unref the sender from memory
    }
  })

  registerEvent({
    name: "org.bukkit.event.player.PlayerToggleSneakEvent",
    async onExecute(event) {
      const [player] = await event.getPlayer().$get();
      const [isSneaking] = await event.isSneaking().$get();
      console.log(`Player ${await player.getName().$get()} is sneaking: ${isSneaking}`);
      await player.sendPlainMessage(`Sneaking: ${isSneaking}`).$run();
      event.$unRef(); // don't forget to unref the event from memory
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
      event.$unRef(); // don't forget to unref the event from memory
    }
  })

  onDisconnect(() => {
    clearInterval(interval);
  });
});

nip.init();
```