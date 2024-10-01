import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { singular } }) => {
  console.log("Registered!");
  setInterval(async () => {
    try {
      await singular.getServer().getPlayer("TheArmagan").sendPlainMessage(`Hello from node.js! Time is: ${new Date().toLocaleString()}`).$exec();
      const [isGetOK, getRes] = await singular.getServer().getPlayer("TheArmagan").$get([
        [
          "uuid",
          (p: any) => p.getUniqueId().toString(),
        ]
      ]);

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

