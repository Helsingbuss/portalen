// src/lib/sendOfferMail.ts
export {
  sendOfferMail,
  sendCustomerReceipt,
  type SendOfferParams,
} from "./sendMail";

import { sendOfferMail as _send } from "./sendMail";
export default _send;
