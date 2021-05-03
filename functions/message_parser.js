"use strict";
// const functions = require("firebase-functions");

// const config = functions.config();

// def get_all_urls_from_elements(elements):
//     for element in elements:
//         if element['type'] == 'link':
//             yield element['url']
//         elif element['type'] in ('rich_text_section', 'rich_text'):
//             for url in get_all_urls_from_elements(element['elements']):
//                 yield url

/**
 * Extracts urls from the rich text elements
 * @param {Array<Object>} elems
 * @return {Array} Url strings
 */
function extractUrlsFromElements(elems) {
  const allUrls = [];
  elems.forEach((elem) => {
    if (elem.type == "link") {
      allUrls.push(elem.url);
    } else if (elem.type == "rich_text_section" || elem.type == "rich_text") {
      extractUrlsFromElements(elem.elements).forEach((u) => {
        allUrls.push(u);
      });
    }
  });
  console.log(allUrls);
  return allUrls;
}


// def find_all_urls(blocks):
//     urls = []

//     if not blocks:
//         return urls

//     urls = list(get_all_urls_from_elements(blocks))

//     return urls


/**
 * Extracts elements from the rich-text blocks
 * @param {Array} blocks
 * @return {Array} Url strings
 */
function extractAllUrlsFromRichTextBlocks(blocks) {
  let urls = [];
  if (blocks) {
    urls = extractUrlsFromElements(blocks);
  }
  return urls;
}


exports.extractEmailIdsFromMessage = function(txt, blocks) {
  const emailPattern = /[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+/g;
  const emailUrlPattern = /<?mailto:([^|>]+)\|?>?/g;

  const txtEmails = txt.match(emailPattern);
  const urlEmailMatches = [...txt.matchAll(emailUrlPattern)];
  const urlEmails = [];
  urlEmailMatches.forEach((a) => {
    urlEmails.push(a[1]);
  });

  if (blocks) {
    const richTextBlockUrls = extractAllUrlsFromRichTextBlocks(blocks);
    richTextBlockUrls.forEach((u) => {
      [...u.matchAll(emailUrlPattern)].forEach((a) => {
        urlEmails.push(a[1]);
      });
    });
  }

  let allEmails = [];
  if (txtEmails) {
    allEmails = txtEmails;
    if (urlEmails) {
      allEmails = txtEmails.concat(urlEmails);
    }
  } else {
    allEmails = urlEmails;
  }
  console.log(allEmails);

  return [...new Set(allEmails.map((em) => em.toLowerCase()))];
};

exports.extractPhoneNumbersFromMessage = function(txt, blocks) {
  const phoneNoPattern = /[0-9]{3,}/g;
  const phoneUrlPattern = /<?tel:([^|>]+)\|?>?/g;

  const txtPhoneNos = txt.match(phoneNoPattern);
  const urlPhoneMatches = [...txt.matchAll(phoneUrlPattern)];
  const urlPhoneNos = [];
  urlPhoneMatches.forEach((a) => {
    urlPhoneNos.push(a[1]);
  });

  if (blocks) {
    const richTextBlockUrls = extractAllUrlsFromRichTextBlocks(blocks);
    richTextBlockUrls.forEach((u) => {
      [...u.matchAll(phoneUrlPattern)].forEach((a) => {
        urlPhoneNos.push(a[1]);
      });
    });
  }

  let allPhoneNos = [];
  if (txtPhoneNos) {
    allPhoneNos = txtPhoneNos;
    if (urlPhoneNos) {
      allPhoneNos = txtPhoneNos.concat(urlPhoneNos);
    }
  } else {
    allPhoneNos = urlPhoneNos;
  }
  console.log(allPhoneNos);

  return [...new Set(allPhoneNos)]; // make unique
};

exports.extractPossibleBankAccountsFromMessage = function(txt) {
  const lowerTxt = txt.toLowerCase();
  const lines = lowerTxt.split("\n");
  const wordSplits = lines.map((line) => line.split(/[ ,]+/));
  const flattennedTxt = wordSplits.flat();
  return [...new Set(flattennedTxt)];
};
