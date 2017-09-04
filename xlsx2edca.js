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

function findRows(WorkSheet, index, key) {
    let rowList = [];
    for (let i=0; i< WorkSheet.length; i++){
        if (WorkSheet[i][index] === key){
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
    //let planning_cotizaciones_worksheet_index = 7;
    let planning_budget_worksheet_index = 8;
    //let planning_milestones_worksheet_index = 9;
    let planning_documents_worksheet_index = 10;

    let tender_worksheet_index = 11;
    let tender_items_worksheet_index = 14;
    let tender_tenderers_worksheet_index = 15;
    let tender_procuring_entity_worksheet_index = 16;

    let awards_worksheet_index = 20;
    let awards_suppliers_worksheet_index = 21;
    let awards_items_worksheet_index = 22;
    let awards_documents_worksheet_index = 23;

    let contracts_worksheet_index = 25;
    let contracts_items_worksheet_index = 26;
    let contracts_documents_worksheet_index = 27;

    console.log('\nBuilding EDCA JSON ...\n');

    //Releases
    let paths = worksheets[release_worksheet_index].data[0];
    for (let ri = 1; ri < worksheets[release_worksheet_index].data.length; ri++) {
        
        //build release object 
        let release = buildBlock(paths, worksheets[release_worksheet_index].data[ri]);
        
        if (release.clave_procedimiento !== null && release.clave_procedimiento !== "" && typeof release.clave_procedimiento !== 'undefined') {
            console.log('Processing ', release.clave_procedimiento);
            release.initiationType = "tender";

            //Parties
            release.parties = [];
            let partiesIndexes = findRows(worksheets[parties_worksheet_index].data, 0, release.clave_procedimiento);
            paths = worksheets[parties_worksheet_index].data[0];

            if (partiesIndexes.length > 0) {
                for (let p of partiesIndexes) {
                    release.parties.push(buildBlock(paths, worksheets[parties_worksheet_index].data[p]).parties); //fixes path
                }
            } else {
                console.log('\tWarning: Missing parties ', release.clave_procedimiento);
            }

            //Buyer
            paths = worksheets[buyer_worksheet_index].data[0];
            let buyerIndex = findRows(worksheets[buyer_worksheet_index].data, 0, release.clave_procedimiento);
            if (buyerIndex.length > 0) {
                release.buyer = buildBlock(paths, worksheets[buyer_worksheet_index].data[buyerIndex[0]]).buyer; //fixes path
            } else {
                console.log('\tWarning: Missing buyer ', release.clave_procedimiento);
            }

            //planning
            paths = worksheets[planning_worksheet_index].data[0];
            let planningIndex = findRows(worksheets[planning_worksheet_index].data, 0, release.clave_procedimiento);
            if (planningIndex.length > 0) {
                release.planning = buildBlock(paths, worksheets[planning_worksheet_index].data[planningIndex[0]]).planning; //fixes path
            } else {
                release.planning = {};
                console.log('\tWarning: Missing planning ', release.clave_procedimiento);
            }

            //planning -> contizaciones

            //planning -> budget
            paths = worksheets[planning_budget_worksheet_index].data[0];
            let planningBudgetIndex = findRows(worksheets[planning_budget_worksheet_index].data, 0, release.clave_procedimiento);

            if (planningBudgetIndex.length > 0) {
                release.planning.budget = buildBlock(paths, worksheets[planning_budget_worksheet_index].data[planningBudgetIndex[0]]).budget; //fixes path
            } else {
                release.planning.budget = {};
                console.log('\tWarning: Missing planning -> budget ', release.clave_procedimiento);
            }

            //planning milestones

            //planning documents
            paths = worksheets[planning_documents_worksheet_index].data[0];
            let planningDocumentsIndexes = findRows(worksheets[planning_documents_worksheet_index].data, 0, release.clave_procedimiento);

            release.planning.documents = [];
            if (planningDocumentsIndexes.length > 0) {
                for (let d of planningDocumentsIndexes) {
                    release.planning.documents.push(buildBlock(paths, worksheets[planning_documents_worksheet_index].data[d]).planning.documents); // fixes path
                }
            } else {
                console.log('\tWarning: Missing planning -> documents ', release.clave_procedimiento);
            }

            //tender
            release.tender = {};
            paths = worksheets[tender_worksheet_index].data[0];
            let tenderIndex = findRows(worksheets[tender_worksheet_index].data, 0, release.clave_procedimiento);

            if (tenderIndex.length > 0) {
                release.tender = buildBlock(paths, worksheets[tender_worksheet_index].data[tenderIndex[0]]).tender; //fixes path
            } else {
                console.log('\tWarning: Missing tender ', release.clave_procedimiento);
            }

            //tender -> items
            release.tender.items = [];
            let tenderItemsIndexes = findRows(worksheets[tender_items_worksheet_index].data, 0, release.clave_procedimiento);
            paths = worksheets[tender_items_worksheet_index].data[0];

            if (tenderItemsIndexes.length > 0) {
                for (let item of tenderItemsIndexes) {
                    release.tender.items.push(buildBlock(paths, worksheets[tender_items_worksheet_index].data[item]).tender.items); //fixes path
                }
            } else {
                console.log('\tWarning: Missing tender -> items ', release.clave_procedimiento);
            }

            //tender -> tenderers
            release.tender.tenderers = [];
            let tenderTenderersIndexes = findRows(worksheets[tender_tenderers_worksheet_index].data, 0, release.clave_procedimiento);
            paths = worksheets[tender_tenderers_worksheet_index].data[0];

            if (tenderTenderersIndexes.length > 0) {
                for (let tenderer of tenderTenderersIndexes) {
                    release.tender.tenderers.push(buildBlock(paths, worksheets[tender_tenderers_worksheet_index].data[tenderer]).tender.tenderers); //fixes path
                }
            } else {
                console.log('\tWarning: Missing tender -> tenderers ', release.clave_procedimiento);
            }

            //tender -> procuringEntity
            release.tender.procuringEntity = {};
            let tenderProcuringEntityIndex = findRows(worksheets[tender_procuring_entity_worksheet_index].data, 0, release.clave_procedimiento);
            paths = worksheets[tender_procuring_entity_worksheet_index].data[0];

            if (tenderProcuringEntityIndex.length > 0) {
                release.tender.procuringEntity = buildBlock(paths, worksheets[tender_procuring_entity_worksheet_index].data[tenderProcuringEntityIndex[0]]).tender.procuringEntity; //fixes path
            } else {
                console.log('\tWarning: Missing tender -> procuringEntity ', release.clave_procedimiento);
            }

            //awards
            release.awards = [];
            paths = worksheets[awards_worksheet_index].data[0];
            let awardsIndexes = findRows(worksheets[awards_worksheet_index].data, 0, release.clave_procedimiento);

            if (awardsIndexes.length > 0) {
                for (let awardIndex of awardsIndexes) {
                    let award =  buildBlock(paths, worksheets[awards_worksheet_index].data[awardIndex]).awards; //fixes path
                    //Add blocks to their respective award
                    let award_id = worksheets[awards_worksheet_index].data[awardIndex][1];

                    //awards -> suppliers
                    award.suppliers = [];
                    let awardSuppliersIndexes = findRows(worksheets[awards_suppliers_worksheet_index].data, 1, award_id);

                    if (awardSuppliersIndexes.length > 0) {
                        for (let supplier of awardSuppliersIndexes) {
                            award.suppliers.push(buildBlock(worksheets[awards_suppliers_worksheet_index].data[0],
                                worksheets[awards_suppliers_worksheet_index].data[supplier]).awards.suppliers); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing awards -> suppliers ', award_id);
                    }


                    //awards -> items
                    award.items = [];
                    let awardItemsIndexes = findRows(worksheets[awards_items_worksheet_index].data, 1, award_id);

                    if (awardItemsIndexes.length > 0) {
                        for (let item of awardItemsIndexes) {
                            award.items.push(buildBlock(worksheets[awards_items_worksheet_index].data[0],
                                worksheets[awards_items_worksheet_index].data[item]).awards.items); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing awards -> items ', award_id);
                    }

                    //awards -> documents
                    award.documents = [];
                    let awardDocumentsIndexes = findRows(worksheets[awards_documents_worksheet_index].data, 1, award_id);

                    if (awardDocumentsIndexes.length > 0) {
                        for (let document of awardDocumentsIndexes) {
                            award.documents.push(buildBlock(worksheets[awards_documents_worksheet_index].data[0],
                                worksheets[awards_documents_worksheet_index].data[document]).awards.documents); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing awards -> documents ', award_id);
                    }

                    release.awards.push( award );
                }
            } else {
                console.log('\tWarning: Missing awards ', release.clave_procedimiento);
            }

            //contracts
            release.contracts = [];
            paths = worksheets[contracts_worksheet_index].data[0];
            let contractsIndexes = findRows(worksheets[contracts_worksheet_index].data, 0, release.clave_procedimiento);

            if (contractsIndexes.length > 0) {
                for (let contractIndex of contractsIndexes) {
                    let contract = buildBlock(paths, worksheets[contracts_worksheet_index].data[contractIndex]).contracts; //fixes path

                    //Add blocks to their respective block
                    let contract_id = worksheets[contracts_worksheet_index].data[contractIndex][1];

                    //contracts -> items
                    contract.items = [];
                    let contractItemsIndexes = findRows(worksheets[contracts_items_worksheet_index].data, 1, contract_id);

                    if (contractItemsIndexes.length > 0) {
                        for (let item of contractItemsIndexes) {
                            contract.items.push(buildBlock(worksheets[contracts_items_worksheet_index].data[0],
                                worksheets[contracts_items_worksheet_index].data[item]).contracts.items); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing contract -> items ', contract_id);
                    }

                    //contracts -> documents
                    contract.documents = [];
                    let contractDocumentsIndexes = findRows(worksheets[contracts_documents_worksheet_index].data, 1, contract_id);

                    if (contractDocumentsIndexes.length > 0) {
                        for (let document of contractDocumentsIndexes) {
                            contract.documents.push(buildBlock(worksheets[contracts_documents_worksheet_index].data[0],
                                worksheets[contracts_documents_worksheet_index].data[document]).contracts.documents); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing awards -> documents ', contract_id);
                    }

                    //contracts -> implementation -> transactions
                    //contract.implementation = {}; contract.implementation.transactions = [ ];

                    release.contracts.push( contract );
                }
            } else {
                console.log('\tWarning: Missing contracts ', release.clave_procedimiento);
            }

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