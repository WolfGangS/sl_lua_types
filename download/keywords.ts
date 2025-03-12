import * as meta from "@caspertech/node-metaverse";
import { writeFileSync } from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

if (process.argv.length != 6) {
  throw "Incorrect arg count expected: node <script> <first_name> <last_name> <password> <location>";
}

async function run() {
  const loginParameters2 = new meta.LoginParameters();
  loginParameters2.firstName = process.argv[2];
  loginParameters2.lastName = process.argv[3];
  loginParameters2.passwordPrehashed = true;
  loginParameters2.password = "$1$" + process.argv[4];
  loginParameters2.start = process.argv[5];
  loginParameters2.agreeToTOS = true;
  loginParameters2.readCritical = true;

  const options = meta.BotOptionFlags.LiteObjectStore |
    meta.BotOptionFlags.StoreMyAttachmentsOnly;
  const bot: meta.Bot = new meta.Bot(loginParameters2, options);

  try {
    await bot.login();
    console.log("============================");
    console.log("============LOGIN===========");
    console.log("============================");
    console.log("");

    await bot.connectToSim();

    console.log("============================");
    console.log("==========CONNECTED=========");
    console.log("============================");
    console.log("");

    await (new Promise((res) => setTimeout(res, 5000)));

    const LSL = await bot.getCurrentRegion().caps.getCapability("LSLSyntax");

    console.log("============================");
    console.log("=============LSL============");
    console.log("============================");
    console.log(LSL);

    const resp = await fetch(LSL, {});
    const text = await resp.text();

    writeFileSync("data/keywords_lsl_download.llsd.xml", text);
  } catch (e: any) {
    console.error("Error", e);
  }
  await (new Promise((res) => setTimeout(res, 5000)));
  await bot.close();
}

run().then(() => {
  console.log("RUNNING");
});
