/**
 * Soulbound NFT Contract Source
 *
 * This code should contain the contract source for the NFT.
 * It should NOT include a transfer function.
 * The contract state and tags should conform to ANS-110
 */

export function handle(state, action) {
  const input = action.input;
  const caller = action.caller;

  if (input.function === "balance") {
    const target = input.target;
    const ticker = state.ticker;
    const balances = state.balances;
    if (typeof target !== "string") {
      throw new ContractError("Must specificy target to get balance for");
    }
    const balance = balances[target];
    return {
      result: {
        target,
        ticker,
        balance: typeof balance === "number" ? balance : 0
      }
    };
  }

  if (input.function === "transfer") {
    throw new ContractError("Token not transferable");
  }

  throw new ContractError(
    `No function supplied or function not recognised: "${input.function}"`
  );
}
