# Test isolation

Build `docs/agents/testing.md` so up to 7 worktrees can run tests at once without touching each other's state.

1. Find every shared resource a test run touches. Read the test config (`phpunit.xml`, `.env.testing`, `pytest.ini`, `conftest.py`, CI files, docker-compose): databases, ports, cache and tmp paths, queues, external services.

2. For each resource, pick one:
   - **Isolate** per worktree when the config can be parameterised, e.g. `DB_DATABASE=test_<ticket>` through a `phpunit.xml` `<env>` override or env var, a port offset, a per-worktree tmp dir. Write the exact commands to create it (database, schema, migrations, seed).
   - **Lock** when it cannot be isolated: wrap the test command in `flock <lockfile>`, with the lockfile outside the repo. Name the resource and why it cannot be isolated.

3. Write the **cleanup recipe**: the exact commands that drop every per-worktree database and test table and remove tmp dirs created in step 2. Cleanup runs after every test session, pass or fail.

4. Write `docs/agents/testing.md` with three sections: **Isolate** (per resource: the recipe, with `<ticket>` as the placeholder), **Lock** (per resource: the wrapped command), **Cleanup**.

5. Prove it: apply the recipe in two scratch worktrees, run the full suite in both at once, run cleanup in both. Done when both runs match a serial run and no test database or table is left behind.
