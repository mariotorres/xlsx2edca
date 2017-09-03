var fs = require('fs');
var path = require('path');
var xlsx = require('node-xlsx').default;
var file_path = process.argv[2];
var jsonfile = require('jsonfile');

function buildPath (obj, tokens, value){
    let first_token = tokens[0];
    if ( typeof obj[first_token] === 'undefined' ) {
        obj[first_token] = {};
    }

    tokens = tokens.slice(1);

    //recortar tokens
    if (tokens.length > 0) {
        buildPath(obj[first_token], tokens, value);
    } else {
        if (!isArray(first_token)) {
            obj[first_token] = value;
        } else{
            obj[first_token] = [value];
        }
    }
}

function buildBlock(paths, row) {

    let block = {};

    for (let i=0; i < paths.length; i++){
        //path
        let tokens = paths[i].split('/');
        //console.log('tokens -> ',tokens);
        //funcion recursiva para anidar propiedades
        buildPath(block, tokens, row[i]);
    }

    return block;
}

function findRows(WorkSheet, ClaveProcedimiento) {
    let rowList = [];
    for (let i=0; i< WorkSheet.length; i++){
        if (WorkSheet[i][0] === ClaveProcedimiento){
            rowList.push(i);
        }
    }
    return rowList;
}

function deleteNullProperties(obj, recursive) {
    for (let i in obj) {
        if (obj[i] === null || JSON.stringify(obj[i]) === JSON.stringify({}) || obj[i] === '' ) {
            delete obj[i];
        } else if (recursive && typeof obj[i] === 'object') {
            deleteNullProperties(obj[i], recursive);
            if (JSON.stringify(obj[i]) === JSON.stringify({})){
                delete obj[i];
            }
        }
    }
}

function isArray(prop) {
    switch (prop){
        case "roles":
            return true;
            break;
        case "tag":
            return true;
            break;
        default:
            return false;
    }
}

if (typeof file_path !== 'undefined'){
    console.log("Fetching data -> ", file_path);
    const worksheets = xlsx.parse(fs.readFileSync(file_path));

    console.log('Parsed WorkSheets:');
    let ws_index = 0;
    for ( ws of worksheets){
        console.log('\t', ws.name, ' -> index -> ', ws_index );
        ws_index++;
    }

    //worksheet config
    let release_worksheet_index = 2;
    let parties_worksheet_index = 3;
    let buyer_worksheet_index = 4;
    let planning_worksheet_index = 6;
    let planning_cotizaciones_worksheet_index = 7;
    let planning_budget_worksheet_index = 8;
    let planning_milestones_worksheet_index = 9;
    let planning_documents_worksheet_index = 10;
    let tender_worksheet_index = 11;

    console.log('\nBuilding EDCA JSON files\n');

    //Releases
    let paths = worksheets[release_worksheet_index].data[0];
    for (let ri = 1; ri < worksheets[release_worksheet_index].data.length; ri++) {

        let release = buildBlock(paths, worksheets[release_worksheet_index].data[ri]);
        if (release.clave_procedimiento !== null && release.clave_procedimiento !== "" && typeof release.clave_procedimiento !== 'undefined') {
            console.log('Processing ', release.clave_procedimiento);
            release.initiationType = "tender";

            //Parties
            release.parties = [];
            let parties = findRows(worksheets[parties_worksheet_index].data, release.clave_procedimiento);
            paths = worksheets[parties_worksheet_index].data[0];

            if (parties.length > 0) {
                for (let p of parties) {
                    release.parties.push(buildBlock(paths, worksheets[parties_worksheet_index].data[p]).parties); //path
                }
            } else {
                console.log('Warning: Missing parties ', release.clave_procedimiento);
            }

            //Buyer
            paths = worksheets[buyer_worksheet_index].data[0];
            let buyerIndex = findRows(worksheets[buyer_worksheet_index].data, release.clave_procedimiento);
            if (buyerIndex.length > 0) {
                release.buyer = buildBlock(paths, worksheets[buyer_worksheet_index].data[buyerIndex[0]]).buyer; //fix path
            } else {
                console.log('Warning: Missing buyer ', release.clave_procedimiento);
            }

            //planning
            paths = worksheets[planning_worksheet_index].data[0];
            let planningIndex = findRows(worksheets[planning_worksheet_index].data, release.clave_procedimiento);
            if (planningIndex.length > 0) {
                release.planning = buildBlock(paths, worksheets[planning_worksheet_index].data[planningIndex[0]]).planning; //fix path
            } else {
                release.planning = {};
                console.log('Warning: Missing planning ', release.clave_procedimiento);
            }

            //planning -> contizaciones

            //planning -> budget
            paths = worksheets[planning_budget_worksheet_index].data[0];
            let planningBudgetIndex = findRows(worksheets[planning_budget_worksheet_index].data, release.clave_procedimiento);

            if (planningBudgetIndex.length > 0) {
                release.planning.budget = buildBlock(paths, worksheets[planning_budget_worksheet_index].data[planningBudgetIndex[0]]).budget; //fix path
            } else {
                release.planning.budget = {};
                console.log('Warning: Missing budget ', release.clave_procedimiento);
            }

            //planning milestones

            //planning documents
            paths = worksheets[planning_documents_worksheet_index].data[0];
            let planningDocumentsIndex = findRows(worksheets[planning_documents_worksheet_index].data, release.clave_procedimiento);

            release.planning.documents = [];
            if (planningDocumentsIndex.length > 0) {
                for (let d of planningDocumentsIndex) {
                    release.planning.documents.push(buildBlock(paths, worksheets[planning_documents_worksheet_index].data[d]).planning.documents); // fix path
                }
            } else {
                console.log('Warning: Missing documents ', release.clave_procedimiento);
            }

            //tender
            paths = worksheets[tender_worksheet_index].data[0];
            let tenderIndex = findRows(worksheets[tender_worksheet_index].data, release.clave_procedimiento);

            if (tenderIndex.length > 0) {
                release.tender = buildBlock(paths, worksheets[tender_worksheet_index].data[tenderIndex[0]]).tender; //fix path
            } else {
                release.planning.budget = {};
                console.log('Warning: Missing tender ', release.clave_procedimiento);
            }

            //tender -> items
            //tender -> tenderers
            //tender -> procuringEntity

            //awards
            //awards -> suppliers
            //awards -> items
            //awards -> documents

            //contracts
            //contracts
            //contracts -> items
            //contracts -> documents
            //contracts -> implementation -> transactions

            //release package
            let release_package = {
                uri: 'http://inicio.inai.org.mx/SitePages/ifai.aspx',
                version: '1.1',
                publishedDate: (new Date()).toISOString(),
                releases: [release],
                publisher: {
                    name: "Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales",
                    scheme: 'APF',
                    uid: 'INAI',
                    uri: 'http://inicio.inai.org.mx/SitePages/ifai.aspx'
                },
                license: 'https://datos.gob.mx/libreusomx',
                publicationPolicy: 'https://datos.gob.mx/libreusomx'
            };

            //remove empty props
            deleteNullProperties(release_package, true);

            //write JSON to disk
            jsonfile.writeFileSync(path.join(__dirname, 'JSON', ('procedimiento_' + release.clave_procedimiento + '.json')), release_package, {spaces: 2});
        }
    }

} else {
    console.log('Usage: node xlsx2edca.js <xlsx_file_path>');
}