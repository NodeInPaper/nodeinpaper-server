import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { plugin }, onDestroy }) => {
  console.log("Registered!");
  let interval = setInterval(async () => {
    try {
      const [, player] = await plugin
        .getServer()
        .getPlayer("TheArmagan")
        .$exec();

      console.log({ player });

      const [, justId] = await player.getUniqueId().toString().$exec();
      console.log({ justId });

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


      console.log({
        date: new Date().toLocaleString(),
        error,
        res
      });
    } catch (e) {
      console.error(e);
    }
  }, 1000);

  onDestroy(() => {
    clearInterval(interval);
  });
});

nip.init();

