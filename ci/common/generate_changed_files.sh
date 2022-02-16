
echo git fetch --depth=10 --tags patch:Raheem-ai/patch.git $COMMIT_SHA
git fetch --depth=10 --tags patch:Raheem-ai/patch.git $COMMIT_SHA

# gets me the list of tags with the latest first
tagString=$(git tag --list "rc-*" --sort=creatordate)
tags=($(echo $tagString | tr " " "\n"))

# choose latest tag
tag=${tags[0]}

# gets the commit for the tag
echo getting commit for tag $tag
rc_commit=$(git rev-parse tags/$tag~0) 
echo commit is $rc_commit

changed_files=$(git diff --name-only $rc_commit $COMMIT_SHA)
echo $changed_files
echo $changed_files >> changedFiles.txt