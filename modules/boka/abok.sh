echo "## Compiling Abok..."
cd ../abok
yarn tsc
echo "## Updating Ub..."
cd ../ub
yarn add ../abok
cp flexsearch/index.d.ts node_modules/flexsearch/index.d.ts
yarn tsc
echo "## Updating sam..."
cd ../sam
yarn add ../abok
yarn tsc
echo "## Updating Boka..."
cd ../boka
yarn add ../abok
yarn add ../sam
yarn build
