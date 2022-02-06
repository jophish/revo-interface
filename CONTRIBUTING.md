
# Contributing

Thank you for your interest in contributing to the Revo interface! ⚡

# Development

## Running the interface locally

See [README](https://github.com/revo-market/revo-interface#run).

## Engineering standards

Code merged into the `main` branch of this repository should adhere to high standards of correctness and maintainability. 
Use your best judgment when applying these standards.  If code is in the critical path, will be frequently visited, or 
makes large architectural changes, consider following all the standards.

- Have at least one engineer approve of large code refactorings
- At least manually test small code changes, prefer automated tests
- Thoroughly unit test
- If something breaks, add automated tests so it doesn't break again
- Add integration tests for new pages or flows
- Verify that all CI checks pass before merging

## Guidelines

The following points should help guide your development:

- Security: the interface is safe to use
  - Avoid adding unnecessary dependencies due to [supply chain risk](https://github.com/LavaMoat/lavamoat#further-reading-on-software-supplychain-security)
- Reproducibility: anyone can build the interface
  - Avoid adding steps to the development/build processes
  - The build must be deterministic, i.e. a particular commit hash always produces the same build
- Decentralization: anyone can run the interface
  - A Celo node should be the only critical dependency 
  - All other external dependencies should only enhance the UX ([graceful degradation](https://developer.mozilla.org/en-US/docs/Glossary/Graceful_degradation))

## Finding a first issue

Start with issues with the label
[`good first issue`](https://github.com/revo-market/revo-interface/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22).
