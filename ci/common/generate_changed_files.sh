echo git fetch
git fetch origin

echo git diff-tree --no-commit-id --name-only -r $_MERGED_SHA
FILES=$(git diff-tree --no-commit-id --name-only -r $_MERGED_SHA)
echo $FILES

echo git log
echo $(git log)

git log