in_files_to_ignore () {
    local file=$1
    local FILES_TO_IGNORE=$2

    echo 'File: ' $file
    echo 'To Ignore: ' $FILES_TO_IGNORE

    for to_ignore in $FILES_TO_IGNORE
    do
        if [[ $to_ignore == $file ]];
        then
            # 0 = true
            return 0
        fi
    done
    # 1 = false
    return 1
}

should_deploy () {
    files_param=$1[@]
    to_include_param=$2[@]
    to_ignore_param=$3[@]

    files=("${!files_param}")
    files_to_include=("${!to_include_param}")
    files_to_ignore=("${!to_ignore_param}")

    echo "Checking if we should deploy: "
    echo "Files to check: ${files[*]}"
    echo "Files that should cause deploy: ${files_to_include[*]}"
    echo "Files that shouldn't cause deploy: ${files_to_ignore[*]}"

    for file in ${files[@]}
    do
        # 1 = false 
        local deployable=1

        for to_include in ${files_to_include[@]}
        do 
            if [[ $file =~ ^$to_include$ ]] ;
            then
                deployable=0
                echo $file changed
            fi
        done

        if [[ $deployable == 0 ]] && !(in_files_to_ignore $file $files_to_ignore) ;
        then
            # 0 = true
            return 0
        fi
    done

    # 1 = false
    return 1
}