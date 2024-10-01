import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { plugin } }) => {
  console.log("Registered!");
  setInterval(async () => {
    try {
      await plugin
        .getServer()
        .getPlayer("TheArmagan")
        .sendPlainMessage(`Hello from node.js! Time is: ${new Date().toLocaleString()}`)
        .$exec();
      const [isGetOK, getRes] = await plugin.getServer().getPlayer("TheArmagan").$get(
        {
          uuid: (p: any) => p.getUniqueId().toString(),
          x: (p: any) => p.getLocation().getX(),
          y: (p: any) => p.getLocation().getY(),
          z: (p: any) => p.getLocation().getZ(),
        }
      );

      console.log({
        isGetOK,
        getRes,
      });
    } catch (e) {
      console.error(e);
    }
  }, 1000);
});

nip.init();

