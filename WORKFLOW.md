# Genius / 97.school Git workflow

- `main` — stable version for release/deployment.
- `dev` — active development branch.
- New work is committed to `dev` first.
- After testing, changes are merged from `dev` into `main`.

## Local update

```bat
git checkout dev
git pull origin dev
npm install
npm run dev
```

If dependencies did not change, `npm install` can be skipped.

## First-time setup

```bat
git clone https://github.com/Basexdx/97school.git
cd 97school
git checkout dev
npm install
npm run dev
```
