let baseUrl = "https://open-ic.epic.com/FHIR/api/FHIR/DSTU2/";
let patientSearchString = "/Patient?given=Jason&family=Argonaut";
let clientID = "6c12dff4-24e7-4475-a742-b08972c4ea27";
let response_type = "code";
let redirect_uri = "https://example.com/oauth2/redirecturi";
// launch = the launch token (as passed to your web app's launch URL)
// state = <an opaque value used by the client to maintain state between the request and callback.>
// scope = "launch" (this is necessary to indicate the app is launching from the EMR context to enable single sign-on)
let epicMetaDataEndPoint = "https://open-ic.epic.com/Argonaut/api/FHIR/Argonaut/metadata";


let headers =  {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};


function post(endpoint, body){
    var args = {
        body: JSON.stringify(body),
        headers: {
            'Content-Type': "application/x-www-form-urlencoded"
        },
        method: 'POST'
    };
    return fetch(endpoint, args);
}

function fetchEpic(index, query){
    switch(index){
        case "metaData":
            return fetch(epicMetaDataEndPoint, {headers : headers})
                .then(function(response) { return response.json(); });
        case "request":
        //build endpoint string
        // return fetch
        case "epic":
            return fetch(baseUrl + query, {
                headers : headers
            }).then(function(response){
                return response.json();
            });
    }

}

function showAllergies(parentDiv, patient){
    var allergySearchString = "AllergyIntolerance?patient=" + patient.id;
    fetchEpic("epic", allergySearchString)
        .then(function(data){
            console.log(data);
            for(var i=0; i<data.entry.length; i++){
                var aData = data.entry[i];
                var allergy = document.createElement("div");
                allergy.innerHTML = aData.resource.substance.text;
                parentDiv.appendChild(allergy);
            }
        });
}

function showMedications(parentDiv, patient){
    var medicationSearchString = "MedicationOrder?patient=" + patient.id;
    fetchEpic("epic", medicationSearchString)
        .then(function(data){
            console.log(data);
            for(var i=0; i<data.entry.length; i++){
                var aData = data.entry[i];
                var medication = document.createElement("div");
                medication.innerHTML = aData.resource.medicationReference.display;
                parentDiv.appendChild(medication);
            }
        });
}

function loadAuthorizationCode(uri){
    return new Promise(function(resolve, reject) {
        var _uri = uri + "?response_type=code&client_id=" + clientID + "&redirect_uri=" + redirect_uri;
        fetch(_uri, {headers : headers})
            .then(function(response) {
                var code = response.json()['code']; // TODO: may need to get exact stuff
                var authorizationURI = redirect_uri+"?code=" + code;
                fetch(authorizationURI, {headers : headers})
                    .then(function(response) {
                        resolve(response.json()['authorizationCode']); // TODO: may need to get exact stuff
                    }, reject);
            }, reject);
    });

}
function loadMetaData(){
    return new Promise(function(resolve, reject) {
        fetchEpic("metaData", null)
            .then(function(data) {
                var metaData = [];
                console.log(data);
                let authorize = data.rest[0].security.extension[0].extension[0].valueUri;
                let token = data.rest[0].security.extension[0].extension[1].valueUri;
                metaData[0] = authorize;
                metaData[1] = token;
                // same as returning this synchronously
                resolve(metaData);
            }, reject);
    });


}

function fetchProtected(uri, accessToken){
    var _headers = headers;
    _headers.Authorization = "Bearer " + accessToken;
    return fetch(uri, {headers : headers});
}

function loadAccessToken(uri, AuthorizationCode){
    var body = {
        grant_type:"authorization_code",
        code:AuthorizationCode,
        "redirect_uri": redirect_uri,
        client_id: clientID
    };
    return new Promise(function(resolve, reject) {
        post(uri, body)
            .then(function (response) {
                resolve(response.json());
            }, reject);
    });
};

loadMetaData()
    .then(function (metaData) {
        loadAuthorizationCode(metaData[0])
            .then(function (authorizationCode){ console.log(authorizationCode);
                loadAccessToken(metaData[1], authorizationCode)
                    .then(function (data) {
                        var accessToken = data.access_token;
                        var patient = data.patient;
                        var uri = baseUrl + "Patient/" + patient;
                        fetchProtected(uri, accessToken);
                    });
            });


        // var request = getRequest(response_type, clientID, redirect_uri);
        // let name = document.querySelector('#name');
        // let patient = data.entry[0].resource;
        // name.innerHTML = patient.name[0].given[0] + " " + patient.name[0].family[0];
        //
        // let birthDay = document.querySelector('#birthDay');
        // birthDay.innerHTML = patient.birthDate;
        //
        // let allergiesDiv = document.querySelector('#allergies');
        // showAllergies(allergiesDiv, patient);
        //
        // let medicationsDiv = document.querySelector('#medications');
        // showMedications(medicationsDiv, patient);
    });

//https://open-ic.epic.com/argonaut/oauth2/authorize?response_type=code&client_id=6c12dff4-24e7-4475-a742-b08972c4ea27&redirect_uri=http://localhost:8000
//https://open-ic.epic.com/Argonaut/oauth2/authorize?response_type=code&client_id=6c12dff4-24e7-4475-a742-b08972c4ea27&redirect_uri=https://example.com/oauth2/redirecturi