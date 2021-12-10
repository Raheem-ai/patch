// // import {GlobalE} from "@tsed/common";
// import {Context} from "@tsed/platform-params";
// import {OverrideProvider} from "@tsed/di";
// import { ErrorFilter } from "@tsed/common";

// @OverrideProvider(OriginalMiddleware)
// export class CustomMiddleware extends ErrorFilter {
//   public use(@Context() ctx: Context) {
//     ctx.response; // Ts.ED response
//     ctx.request; // Ts.ED resquest
//     ctx.getResponse(); // return Express.js or Koa.js response
//     ctx.getRequest(); // return Express.js or Koa.js request

//     // Do something
//     return super.use();
//   }
// }