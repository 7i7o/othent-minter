/**
 * Soulbound NFT Contract Source
 *
 * This code should contain the contract source for the NFT.
 * It should NOT include a transfer function.
 * The contract state and tags should conform to ANS-110
 */

export function handle(state, action) {
  const balances = state.balances;
  const input = action.input;
  const caller = action.caller;

  if (input.function === "balance") {
    const target = input.target;
    const ticker = state.ticker;
    const divisibility = state.divisibility;
    const balance = balances[target] / divisibility;

    if (typeof target !== "string") {
      throw new ContractError("Must specificy target to get balance for");
    }
    if (typeof balances[target] !== "number") {
      throw new ContractError("Cannnot get balance, target does not exist");
    }

    return {
      result: {
        target,
        ticker,
        balance: balance.toFixed(divisibility),
        divisibility,
      },
    };
  }

  throw new ContractError(
    `No function supplied or function not recognised: "${input.function}"`
  );
}
