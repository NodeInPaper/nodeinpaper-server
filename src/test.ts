import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { $plugin, $class }, onDestroy, registerCommand }) => {
  console.log("Registered!");
  let interval = setInterval(async () => {
    return;
    try {
      // const [, player] = await plugin
      //   .getServer()
      //   .getPlayer("TheArmagan")
      //   .$exec();

      // const [, javaPI] = await $class("java.lang.Math").PI.$exec();
      // console.log({ javaPI });

      const [, onlinePlayers] = await $plugin.getServer().getOnlinePlayers().$exec();
      // console.log({ onlinePlayers });

      onlinePlayers.forEach(async (player: any) => {
        const [error, res] = await player.$get(
          {
            uuid: (p: any) => p.getUniqueId().toString(),
            x: (p: any) => p.getLocation().getX(),
            y: (p: any) => p.getLocation().getY(),
            z: (p: any) => p.getLocation().getZ(),
          }
        );

        //player.sendPlainMessage(`Hello from node.js! Time is: ${new Date().toLocaleString()}`).$exec();
        player.sendActionBar(`X: ${res.x.toFixed(2)} Y: ${res.y.toFixed(2)} Z: ${res.z.toFixed(2)}`).$run();

        // console.log({
        //   date: new Date().toLocaleString(),
        //   error,
        //   res
        // });
      });
    } catch (e) {
      console.error(e);
    }
  }, 100);

  registerCommand({
    name: "nodejs-test",
    async onExecute(sender, label, ...args) {
      const [, playerName] = await sender.getName().$exec();
      console.log("Command executed!");
      sender.sendPlainMessage(`Hello from node.js! Your name: ${playerName}`).$run();
    }
  })

  onDestroy(() => {
    clearInterval(interval);
  });
});

nip.init();

