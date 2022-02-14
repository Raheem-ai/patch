echo git fetch --depth=1 git@github.com:Raheem-ai/patch.git $_MERGED_SHA
git fetch --depth=1 git@github.com:Raheem-ai/patch.git $_MERGED_SHA

echo git diff-tree --no-commit-id --name-only -r $_MERGED_SHA
FILES=$(git diff-tree --no-commit-id --name-only -r $_MERGED_SHA)
echo $FILES

echo git log
echo $(git log)

git log