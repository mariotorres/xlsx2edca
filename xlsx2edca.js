var fs = require('fs');
var path = require('path');
var xlsx = require('node-xlsx').default;
var jsonfile = require('jsonfile');
const dotenv = require('dotenv').config({path: path.join(__dirname, '.env')});

function buildPath (obj, tokens, value){
    let first_token = tokens[0];
    if ( typeof obj[first_token] === 'undefined' ) {
        obj[first_token] = {};
    }

    //recortar tokens
    tokens = tokens.slice(1);

    if (tokens.length > 0) {
        buildPath(obj[first_token], tokens, value);
    } else {
        if (!isArray(first_token)) {
            obj[first_token] = (isBoolean(first_token)?parseBoolean(value):(isNaN(value)?value:Number(value)));
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

    if (Array.isArray(obj) ) {

        for (let i =0; i< obj.length; i++){
            if ( typeof obj[i] === 'undefined' || obj[i] === null){
                obj.splice(i,1);
            }else if (recursive && typeof obj[i] === 'object'){
                deleteNullProperties(obj[i], recursive);
            }
        }
    }


    for (let i in obj) {
        if (JSON.stringify(obj[i]) === JSON.stringify({}) || JSON.stringify(obj[i]) === JSON.stringify([]) ||
            obj[i] === null || obj[i] === '' || obj[i] === 'N/A'|| obj[i]=== 'No aplica') {
            delete obj[i];
        } else if (recursive && typeof obj[i] === 'object') {
            deleteNullProperties(obj[i], recursive);

            //retorno
            if (JSON.stringify(obj[i]) === JSON.stringify({}) || obj[i] === null || typeof obj[i] === 'undefined' ||
                JSON.stringify(obj[i]) === JSON.stringify([])){
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

function isBoolean(prop) {
    switch(prop) {
        case 'hasEnquiries':
            return true;
        default:
            return false;
    }
}

function parseBoolean(b){
    switch (b) {
        case true:
            return true;
        case 'True':
            return true;
        case 'true':
            return true;
        case 'Si':
            return true;
        case 'si':
            return true;
        case false:
            return false;
        case 'False':
            return false;
        case 'false':
            return false;
        case 'no':
            return false;
        case 'No':
            return false;
        default:
            return null
    }
}

const file_path = process.argv[2];


if (typeof file_path === 'undefined'){
    console.log('Usage: node xlsx2edca.js <xlsx_file_path> ...\n' +
        '\t--show-worksheets\t shows worksheets names and indexes');
    process.exit(0);
}

if ( fs.existsSync(file_path) ) {

    console.log("Fetching data -> ", file_path);
    const worksheets = xlsx.parse(fs.readFileSync(file_path));

    if (process.argv[3] === '--show-worksheets'){
        console.log('Parsed WorkSheets:');
        for ( let ws in worksheets){
            console.log('\t', worksheets[ws].name, ' -> index -> ', ws );
        }
        process.exit(0);
    }

    //worksheet config
    let release_worksheet_index = (process.env.RELEASE_WORKSHEET_INDEX || 0);
    let parties_worksheet_index = (process.env.PARTIES_WORKSHEET_INDEX || 1);
    let buyer_worksheet_index = (process.env.BUYER_WORKSHEET_INDEX ||2);

    let planning_worksheet_index = (process.env.PLANNING_WORKSHEET_INDEX || 3);
    let planning_budget_worksheet_index = (process.env.PLANNING_WORKSHEET_INDEX || 4);
    let planning_milestones_worksheet_index = (process.env.PLANNING_MILESTONES_WORKSHETT_INDEX || 5);
    let planning_documents_worksheet_index = (process.env.PLANNING_DOCUMENTS_WORKSHEET_INDEX || 6);

    let tender_worksheet_index = (process.env.TENDER_WORKSHEET_INDEX || 7);
    let tender_items_worksheet_index = (process.env.TENDER_ITEMS_WORKSHEET_INDEX || 8);
    let tender_tenderers_worksheet_index = (process.env.TENDER_TENDERERS_WORKSHEET_INDEX || 9);
    let tender_procuring_entity_worksheet_index = (process.env.TENDER_PROCURING_ENTITY_WORKSHEET_INDEX || 10);
    let tender_documents_worksheet_index = (process.env.TENDER_DOCUMENTS_WORKSHEET_INDEX || 11);
    let tender_milestones_worksheet_index = (process.env.TENDER_MILESTONES_WORKSHEET_INDEX || 12);
    //let tender_amendments_worksheet_index = 13

    let awards_worksheet_index = (process.env.AWARDS_WORKSHEET_INDEX || 14);
    let awards_suppliers_worksheet_index = (process.env.AWARDS_SUPPLIERS_WORKSHEET_INDEX || 15);
    let awards_items_worksheet_index = (process.env.AWARDS_ITEMS_WORKSHEET_INDEX || 16);
    let awards_documents_worksheet_index = (process.env.AWARDS_DOCUMENTS_WORKSHEET_INDEX || 17);
    //let awards_amendments_worksheet_index = 18

    let contracts_worksheet_index = (process.env.CONTRACTS_WORKSHEET_INDEX || 19);
    let contracts_items_worksheet_index = (process.env.CONTRACTS_ITEMS_WORKSHEET_INDEX || 20);
    let contracts_documents_worksheet_index = (process.env.CONTRACTS_DOCUMENTS_WORKSHEET_INDEX || 21);
    //let contracts_amenments = 22
    //contract related process => 23

    let contracts_implementation_transactions_worksheet_index = (process.env.CONTRACTS_IMPLEMENTATION_TRANSACTIONS_WORKSHEET_INDEX || 24);
    let contracts_implementation_milestones_worksheet_index = (process.env.CONTRACTS_IMPLEMENTATION_MILESTONES_WORKSHEET_INDEX || 25);
    let contracts_implementation_documents_worksheet_index = (process.env.CONTRACTS_IMPLEMENTATION_DOCUMENTS_INDEX || 26);

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
            release.planning.milestones = [];
            let planningMilestonesIndexes = findRows(worksheets[planning_milestones_worksheet_index].data, 0, release.clave_procedimiento);

            if (planningMilestonesIndexes.length > 0) {
                for (let milestone of planningMilestonesIndexes) {
                    release.planning.milestones.push(buildBlock(worksheets[planning_milestones_worksheet_index].data[0],
                        worksheets[planning_milestones_worksheet_index].data[milestone]).planning.milestones); //fixes path
                }
            } else {
                console.log('\tWarning: Missing planning -> milestones ', release.clave_procedimiento);
            }

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

            //tender -> documents
            release.tender.documents = [];
            let tenderDocumentsIndexes = findRows(worksheets[tender_documents_worksheet_index].data, 0, release.clave_procedimiento);

            if (tenderDocumentsIndexes.length > 0) {
                for (let document of tenderDocumentsIndexes) {
                    release.tender.documents.push(buildBlock(worksheets[tender_documents_worksheet_index].data[0],
                        worksheets[tender_documents_worksheet_index].data[document]).tender.documents); //fixes path
                }
            } else {
                console.log('\tWarning: Missing tender -> documents ', release.clave_procedimiento);
            }

            //tender -> milestones
            release.tender.milestones = [];
            let tenderMilestonesIndexes = findRows(worksheets[tender_milestones_worksheet_index].data, 0, release.clave_procedimiento);

            if (tenderMilestonesIndexes.length > 0) {
                for (let milestone of tenderMilestonesIndexes) {
                    release.tender.milestones.push(buildBlock(worksheets[tender_milestones_worksheet_index].data[0],
                        worksheets[tender_milestones_worksheet_index].data[milestone]).tender.milestones); //fixes path
                }
            } else {
                console.log('\tWarning: Missing tender -> milestones ', release.clave_procedimiento);
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
                        console.log('\tWarning: Missing contracts -> items ', contract_id);
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
                        console.log('\tWarning: Missing contracts -> documents ', contract_id);
                    }

                    //contracts -> implementation -> transactions
                    contract.implementation = {};
                    contract.implementation.transactions = [];
                    let contractImplementationTransactionsIndexes = findRows(worksheets[contracts_implementation_transactions_worksheet_index].data, 1, contract_id );

                    if (contractImplementationTransactionsIndexes.length > 0) {
                        for (let transaction of contractImplementationTransactionsIndexes) {
                            contract.implementation.transactions.push(buildBlock(worksheets[contracts_implementation_transactions_worksheet_index].data[0],
                                worksheets[contracts_implementation_transactions_worksheet_index].data[transaction]).implementation.transactions); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing contracts -> implementation -> transactions ', contract_id);
                    }

                    //contracts -> implementation -> milestones
                    contract.implementation.milestones = [];
                    let contractImplementationMilestonesIndexes = findRows(worksheets[contracts_implementation_milestones_worksheet_index].data, 1, contract_id);

                    if (contractImplementationMilestonesIndexes.length > 0) {
                        for (let milestone of contractImplementationMilestonesIndexes) {
                            contract.implementation.milestones.push(buildBlock(worksheets[contracts_implementation_milestones_worksheet_index].data[0],
                                worksheets[contracts_implementation_milestones_worksheet_index].data[milestone]).implementation.milestones); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing contracts -> implementation -> milestones ', contract_id);
                    }

                    //contracts -> implementation -> documents
                    contract.implementation.documents = [];
                    let contractImplementationDocumentsIndexes = findRows(worksheets[contracts_implementation_documents_worksheet_index].data, 1, contract_id);

                    if (contractImplementationDocumentsIndexes.length > 0) {
                        for (let document of contractImplementationDocumentsIndexes) {
                            contract.implementation.documents.push(buildBlock(worksheets[contracts_implementation_documents_worksheet_index].data[0],
                                worksheets[contracts_implementation_documents_worksheet_index].data[document]).implementation.documents); //fixes path
                        }
                    } else {
                        console.log('\tWarning: Missing contracts -> implementation -> documents ', contract_id);
                    }

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
            let output_file = path.join(__dirname, 'JSON', ('procedimiento_' + release.clave_procedimiento + '.json'));
            jsonfile.writeFileSync(output_file, release_package, {spaces: 2});
            console.log('\tOutput file: ', output_file);
        }
    }

} else {
    console.log('Error: File does not exists :(');
    process.exit(1);
}