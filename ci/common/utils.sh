in_files_to_ignore () {
    local file=$1
    local FILES_TO_IGNORE=$2

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

should_publish () {
    files_param=$1[@]
    to_include_param=$2[@]
    to_ignore_param=$3[@]

    files=("${!files_param}")
    files_to_include=("${!to_include_param}")
    files_to_ignore=("${!to_ignore_param}")

    echo "Checking if we should publish: "
    echo "Files to check: ${files[*]}"
    echo "Files that should cause publish: ${files_to_include[*]}"
    echo "Files that shouldn't cause publish: ${files_to_ignore[*]}"

    for file in $files
    do
        # 1 = false 
        local publishable=1

        for to_include in $files_to_include
        do 
            if [[ $file =~ "$to_include" ]] ;
            then
                publishable=0
                break
            fi

        done

        if [[ $publishable == 0 ]] && !(in_files_to_ignore $file $files_to_ignore) ;
        then
            # 0 = true
            return 0
        fi
    done

    # 1 = false
    return 1
}