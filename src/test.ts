import { createNIPServer } from ".";

const nip = createNIPServer({
  port: 6798,
  host: "0.0.0.0",
});

nip.register(async ({ api: { singular } }) => {
  console.log("Registered!");
  setInterval(async () => {
    try {
      const res = await singular.getServer().getPlayer("TheArmagan").sendPlainMessage(`Hello from node.js! Time is: ${new Date().toLocaleString()}`).$exec();
      console.log(res);
    } catch (e) {
      console.error(e);
    }
  }, 1000);
});

nip.init();

