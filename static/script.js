      var spinnWheelOpts = {
          lines: 11 // The number of lines to draw
        , length: 28 // The length of each line
        , width: 12 // The line thickness
        , radius: 56 // The radius of the inner circle
        , scale: 0.5 // Scales overall size of the spinner
        , corners: 1 // Corner roundness (0..1)
        , color: '#000' // #rgb or #rrggbb or array of colors
        , opacity: 0 // Opacity of the lines
        , rotate: 0 // The rotation offset
        , direction: 1 // 1: clockwise, -1: counterclockwise
        , speed: 0.7 // Rounds per second
        , trail: 100 // Afterglow percentage
        , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
        , zIndex: 2e9 // The z-index (defaults to 2000000000)
        , className: 'spinner' // The CSS class to assign to the spinner
        , top: '50%' // Top position relative to parent
        , left: '50%' // Left position relative to parent
        , shadow: false // Whether to render a shadow
        , hwaccel: false // Whether to use hardware acceleration
        , position: 'relative' // Element positioning
    };
    var globalActorList = [];
    var spinner = new Spinner(spinnWheelOpts);
    var date = new Date()

    //TODO make site with all the Actors

    $(document).ready(function(){


        var dropZone = document.getElementById('dropzone');
        dropZone.addEventListener('dragover', handleDragOver, false);
        dropZone.addEventListener('drop', handleFileSelect, false);

        $(".icon#Edit").click(enterCorrectionMode);
        $("#correction_selector button").click(sendCorrection);

    // $("#actor_options").keyup(function(event){
    // if(event.keyCode == 13){
    //     sendCorrection();
    // }
    // });

    // $('#actor_options').change(function() {
    // var val = $("#actor_options option:selected").text();
    // alert(val);
    // });

    dataList = document.getElementById("actors_list");
    $.get("api/actorList", function(actorList){
        globalActorList = actorList;
         actorList.forEach(function(actor) {
            // Create a new <option> element.
            var option = document.createElement('option');
            // Set the value using the item in the JSON array.
            option.value = actor;
            // Add the <option> element to the <datalist>.
            dataList.appendChild(option);
        });
    }, "json");

});


function enterCorrectionMode(){
    $(".normal_title").hide();
    $("#icon_buttons").hide();
    $("#correction_selector").show();
}

function sendCorrection(){
        var myNewName = $("#actor_options").val();
        if(-1 != $.inArray(myNewName, globalActorList)){ 
            $.post("/api/correctClassification/"+sessionStorage.currentImageId,
                {newName: myNewName},
                function(data,status){
                    //alert("Data: " + data.message + "\nStatus: " + status);
                    if(status!="success"){
                        alert("We couldn't update the classifier: " + data.message + " status: "+ status)
                    }
                });
            displayActorInfo(myNewName, false);
        }
        else{
            var inputfield = $("#correction_selector");
            inputfield.animate({paddingLeft: "10px"}, 70);
            inputfield.animate({paddingLeft: "0px"}, 60);
            inputfield.animate({paddingLeft: "10px"}, 50);
            inputfield.animate({paddingLeft: "0px"}, 50);
            inputfield.animate({paddingLeft: "10px"}, 60);
            inputfield.animate({paddingLeft: "0px"}, 70);
           // inputfield.animate({paddingLeft: "10px"}, 250);
        }
        $("#actor_options").val("");
    }

    function displayActorInfo(name, allow_edit){
        $.get("/api/actorInfo/" + name,
                function(data, status){
                    //alert("Data: " + data.message + "\nStatus: " + status);
                    if(status=="success"){
                        $("#actor_text").text(data);
                    }
                    else{
                        $("#actor_text").text("Server didn't give us data" + status);
                    }
            });
        $("#actor_name").text(name);
        $("#correction_selector").hide();
        $(".normal_display").show();
        if(allow_edit){
            $("#icon_buttons").show();
        }
    }

    function handleDragOver(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
    }

    function handleFileSelect(evt) {
        evt.stopPropagation();
        evt.preventDefault();


        var file = evt.dataTransfer.files[0];
        if(null != file.type.match("image/*")){
            var target = document.getElementById('dropzone');
            document.getElementById('help_text').style.display= "none";
            spinner.spin(target);
            uploadFile(file);
        }
        else{
            alert("please choose an image file!");
        }
    }

    function uploadFile(file){
        // var fileSelect = document.getElementById('file-select');
        // console.log("blabla")
        // console.log(fileSelect.files[0])
        // var formdata = new FormData();
        // formdata.append("file", fileSelect.files[0])

        var formdata = new FormData();
        formdata.append("file", file)
        var xhttp = new XMLHttpRequest();

        xhttp.onreadystatechange = function(){         
            if (this.readyState == 4 && this.status == 200) {
                let respObject = jQuery.parseJSON(this.responseText);
                processClassificationResult(respObject);
            }
            else if(this.readyState == 4 && this.status != 200){
                alert("Classification Failed");
                location.reload();
            }
        };

        console.log(sessionStorage.currentImageId);
        sessionStorage.currentImageId = date.getTime()%1000000
        xhttp.open("POST", "api/classifyImage/"+sessionStorage.currentImageId, true);
        xhttp.send(formdata);
        return false;
    }

    function processClassificationResult(answer){
        // $("#result").text(answer.responseText)
        var imgSrc = "/api/getPreProcessedImg/" + sessionStorage.currentImageId;
        $("#preview_img").one("load", function(){displayClassificationResult(answer);});
        $("#preview_img").attr("src", imgSrc);
        $("#preview_img").show();
    }

    function displayClassificationResult(answer){
        spinner.stop();
        var name = answer.label;
        displayActorInfo(name, true)
    }
