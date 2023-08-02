const functions = require("firebase-functions")
const { onRequest, onCall } = require("firebase-functions/v2/https")

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app')
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore')

const fs = require('fs')

//const serviceAccount = require('../mtg-closet-469ffded52e4.json')

initializeApp()

const db = getFirestore()

exports.addcardtodb = onCall({timeoutSeconds: 540}, (request) => {
    
    const uid = request.auth.uid
    if (!uid) return false

    var card = request.data.card
    return new Promise((resolve, reject) => {
        const userRef = db.collection('users').doc(uid)
        userRef.get().then((userDoc) => {
            if (!userDoc.exists) { 
                console.log("No user table")
                resolve(false) 
            }
    
            var data = userDoc.data()
            if (!(data)) {
                console.log("Empty user table")
                resolve(false) 
            }
            if (!(data.isAdmin === true)) {
                console.log("No access!")
                resolve(false)
            }

            var batch = db.batch()

            batch.set(db.collection('cards').doc("" + card.id), {
                name: "" + card.name,
                set: "" + card.set,
                rarity: "" + card.rarity,
                released_at: card.released_at ? "" + card.released_at : '',
                scryfall_uri: card.scryfall_uri ? "" + card.scryfall_uri : '',
                layout: card.layout ? card.layout : '',
                image_uris: card.image_uris ? {...card.image_uris} : {},
                mana_cost: card.mana_cost ? "" + card.mana_cost : '',
                cmc: card.cmc ? card.cmc : 0,
                type_line: card.type_line ? "" + card.type_line : '',
                flavor_text: card.flavor_text ? "" + card.flavor_text : '',
                oracle_text: card.oracle_text ? "" + card.oracle_text : '',
                power: card.power ? "" + card.power : 0,
                toughness: card.toughness ? "" + card.toughness : 0,
                colors: card.colors ? [...card.colors] : [],
                color_identity: card.color_identity ? [...card.color_identity] : '',
                finishes: card.finishes ? [...card.finishes] : [],
                prices: card.prices ? {...card.prices} : {}

            })

            var cardName = card.name.replace(/([/ ])/g, '')

            batch.set(db.collection('cardNames').doc("" + cardName), {
                entries: [{
                    id: "" + card.id,
                    set: card.set ? "" + card.set : ""
                }]
            }, {merge: true})

            

            batch.set(db.collection('sets').doc("" + card.set), {
                name: "" + card.set_name,
                id: card.set_id ? "" + card.set_id : "",
                type: card.set_type ? "" + card.set_type : "",
                uri: card.scryfall_set_uri ? "" + card.scryfall_set_uri : ""
            })

            

            batch.commit().then((r) => { delete batch ; resolve(true) }).catch(e => reject(e))

        })

        

        
    })
})