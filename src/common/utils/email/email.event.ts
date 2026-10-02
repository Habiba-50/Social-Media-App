import { EventEmitter } from "node:events";


export const emailEmitter = new EventEmitter();


emailEmitter.on("send-email", async (emailFunction) => {
  try {
    await emailFunction()
  } catch (error) {
    console.log("Fail to send email",error)
  }
});