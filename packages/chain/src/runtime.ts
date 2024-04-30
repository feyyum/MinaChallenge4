import { Field, Mina, UInt64 } from "o1js";
import { Balances } from "./balances";
import { runtimeModule } from "@proto-kit/module";
import { MinaChallenge4 } from "./MinaChallenge4";

@runtimeModule()
export class CustomBalances extends Balances {}

export default {
  modules: {
    Balances,
    CustomBalances,
    MinaChallenge4
  },
  config: {
    Balances: {
      totalSupply: UInt64.from(10_000),
    },
    CustomBalances: {
      totalSupply: UInt64.from(10_000),
    },
    MinaChallenge4: {
      messageMaxChars: Field(12),
    },
  },
};
