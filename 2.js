/*
 * Welcome Software
 * Integration Specialist Aptitude Test
 *
 * Task 	: 	#2
 * Desc		: 	Script to find the Top 3 articles that contain 
 *				the most frequently recurring words in titles 
 *				and generate a CSV file with those Titles information
 * Author	: 	Sarwat Osman
 *
 */

// TODO: 
// Dont count '-' as a word separator. Only Whitespace is delimiter
// Ignore cases or Convert all to lowercase
// Ignore Articles, Joining words, etc.

var frequencyObject = {};	// list of words with number of occurences
const ignoreDict = [
	"a",
	"an",
	"the",
	"is",
	"are",
	"was",
	"were",
	"have",
	"has",
	"be",
	"and",
	"for",
	"with",
	"in",
	"at"
];							// list of less prominent words that can be ignored

 
const https = require('https');
const objectsToCsv = require('objects-to-csv');

// METHOD : Get the JSON feed content using Web Request
const fetchJsonFeed = () => new Promise((resolve, reject) => {
    https.get(`https://api.welcomesoftware.com/v2/feed/49e82ccda46544ff4e48a5fc3f04e343?format=json`, res => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", data => body += data);
        res.on('end', () => {
            const bodyParsed = JSON.parse(body);
            resolve({ responseData: bodyParsed });
        });
    });
});

// METHOD : Parse JSON feed to JS Object Array
const parseJsonFeedEntries = (jsonFeed) => new Promise(async (resolve, reject) => {
    var objectArray = JSON.parse(JSON.stringify(jsonFeed.entries));
    resolve(objectArray);
});

// METHOD : Clean and Preprocess Titles before further operations
const preprocessContentTitles = (entriesArray) => new Promise(async (resolve, reject) => {
	// Fetch Titles from entries and convert them to lowercase
	let titlesArray = entriesArray.map(entry => entry.content.title.toLowerCase());

	// Remove duplicate words in same title and Ignore insignificant joining words
    let titlesWordsArray = titlesArray.map(title => {
    	let nonUniqueWordsArray = title.split(' ');
    	let uniqueWordsArray = [...new Set(nonUniqueWordsArray)];
    	let postIgnoreWordsArray = uniqueWordsArray.filter(word => !ignoreDict.includes(word));
    	return postIgnoreWordsArray;
    });

    resolve(titlesWordsArray);
});

// METHOD : Find Top 3 Articles by further processing and sorting Titles
const findTopArticles = (preprocessedTitlesWordsArray) => new Promise(async (resolve, reject) => {
    // Measure frequency of words in titles
    preprocessedTitlesWordsArray.forEach((wordArray, arrayIndex, outerWordArray) => {
    	wordArray.forEach((word, wordIndex, innerWordArray) => {
    		frequencyObject[word] = word in frequencyObject ? frequencyObject[word] + 1 : 0;
      	});
    });

    // Create a Popularity Rank List for Titles based on word weight
    let titlePopularityRank = [];
	preprocessedTitlesWordsArray.forEach((wordArray, arrayIndex, outerWordArray) => {
		count = 0;
    	wordArray.forEach((word, wordIndex, innerWordArray) => {
    		count+= frequencyObject[word];
      	});
      	titlePopularityRank.push({
			"index": arrayIndex,
			"weight": count
		});
    });

	// Sort the titles
    titlePopularityRank.sort((a, b) => b.weight - a.weight);

    // Find Top 3 Titles & Tie-Breaker!
    let topTitlesArray = [];
    titlePopularityRank.forEach((titleObject, index, array) => {
    	if(index > 2 && titleObject.weight != array[2].weight) {
    		return false;
    	} else {
    		topTitlesArray.push(titleObject);
    	}
    })
    resolve(topTitlesArray);
});

// METHOD : Generate CSV file with information on Top Articles
const generateCsvTopArticles = (topTitlesArray, entriesObjArray) => new Promise(async (resolve, reject) => {
	let csvArticlesObjectsArray = [];
	topTitlesArray.forEach((titleObject) => {
		let imageThumbnailLink = entriesObjArray[titleObject.index].content.images.thumbnail 
		? entriesObjArray[titleObject.index].content.images.thumbnail 
		: "";
		let imageUrlLink = entriesObjArray[titleObject.index].content.images.url
		? entriesObjArray[titleObject.index].content.images.url
		: "";
		let imageLinks = imageThumbnailLink + "," + imageUrlLink;
		csvArticlesObjectsArray.push({
			"Guid" : entriesObjArray[titleObject.index].content.guid,
			"Title" : entriesObjArray[titleObject.index].content.title,
			"Related Image Urls" : imageLinks,
			"Publish Date" : entriesObjArray[titleObject.index].content.published_at,
			"Creation Date" : entriesObjArray[titleObject.index].content.created_at,
			"Recurrence count sum of words in the article title" : titleObject.weight,
		});
	});

	const csv = new objectsToCsv(csvArticlesObjectsArray);

	// Save to file:
	await csv.toDisk('./top_articles.csv');
});


// MAIN METHOD
const main = async () => {
	return new Promise(async (resolve, reject) => {
		try {
	        const requestedData = await fetchJsonFeed();
	        const entries = await parseJsonFeedEntries(requestedData.responseData);
	        const cleanedTitles = await preprocessContentTitles(entries);
	        const titleRankList = await findTopArticles(cleanedTitles);
	        await generateCsvTopArticles(titleRankList, entries);
		} catch (err) {
	        console.log(err);
	    }
    });
}


main()
	