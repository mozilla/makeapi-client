The Make API client library works in both browser and node.js contexts.
It can also be loaded using require.js.

## Constructor ##

###`new Make( options )`###

Returns an instance of the client library that interacts with a Make API server.

>`options` - An object with the following attributes:
>
> + `apiURL` - **required** - A valid URL pointing to the Make API server
> + `apiPrefix` - **optional** - A path to append the API URL, defaults to `"/api/20130724/make/"`
> + `csrfToken` - **optional** - An optional CSRF token to send in request headers (browser environments only)
> + `hawk` - **optional** - Hawk credentials to be used for authentication. In order to Create, Update, Delete, Like and Unlike make records, you must provide auth. Without this, you will only be permitted to search for makes.

####Example####
```
// without auth - Search only
var makeapi = new Make({
  apiURL: "http://makeapi.webmaker.org"
});

// with auth - Full CRUD functionality
var makeapiTwo = new Make({
  apiURL: "http://makeapi.webmaker.org",
  hawk: {
    // secret shared key
    key: "00000000-0000-0000-000000000000",
    // public key
    id: "00000000-0000-0000-000000000000"
  }
});
```
See [the MakeAPI README](https://github.com/mozilla/MakeAPI/#api-keys) for more info about API keys and Hawk

## Searching ##


###`then( callback )`###

Execute the search that has been built. Once the search data has been sent to the server, the make object will be cleared and ready to build another search.

>`callback` a function to execute when the server responds to a search request. The function must accept two or three parameters: `( error, makes [, total ] )` - if nothing went wrong, error will be `null`, and makes matching your search will be passed as the second parameter. The optional third parameter is the total number of matched hits that Elastic Search found. This may be equal to or greater than the array of makes returned.

###Example###
```
var makeapi = new Make( optionsObj );

// Executing `then` without specifying any search filters will return the first 10 makes
// that the MakeAPI's Elastic Search cluster has indexed (so in no particular order).
makeapi.then(function( err, makes ) {
  if( err ) {
    // handle error case
  }
  // handle success!
});

// Executing `then` and passing in three parameters:
makeapi.then(function( err, makes, total ) {
  if( err ) {
    // handle error
  }
  // total can be used to determine if there are more pages to be fetched (see the `page` function)
});
```

###`find( options )`###

Add filters to your search based on the attributes of the options parameter.

>`options` - **required** - An object that can contain attributes corresponding to any other valid search function (see example below and other search function docs). The value of each search attribute can be a String or Array. If an array, the elements will be applied to the corresponding search function as arguments.
>
>Tags is a special case in find, It will only work with an object definition. See the example below.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .find({
    // search for two tags
    tags: [
      {
        tags: [ "awesome", "technology" ]
      }
    ],
    description: "kittens"
  })
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

makeapi
  .find({
    tags: [
      {
        tags: [ "awesome", "technology" ]
      },
      // filter for makes *without* the tags above
      false
    ],
    description: "kittens"
  })
  .then(function( err, makes ) {
    // handle response
  });
```

###`author( name, not )`###

Add a filter to the search for the specified author.

>`name` - **required** - A string containing the authors name
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** contain the specified name

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .author( "Mr. Anonymous" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// I want makes where the author is NOT mr. Anonymous
makeapi
  .author( "Mr. Anonymous", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`user( name, not )`###

Add a filter to the search for the specified username.

>`name` - **required** - A string containing the username of the maker you want to filter for
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** contain the specified user

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .user( "amazingWebmaker" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

makeapi
  .user( "amazingWebmaker", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`tags( options, not )`###

Add a filter to the search for the specified tag[s].

>`options` - An Object or Array. If it is an Array, it should contain one or all of the tags you wish to filter against. If it is an object, it must contain the following:
>
> + `tags` - **required** - An Array of tags, specified as strings
> + `execution` - **optional** - can be one of "and" and "or" Specifies if multiple tags should be searched for using AND/OR logic. defaults to "and". I.E. "tag1" OR "tag2"
> + **ONLY THE OBJECT STYLE DEFINITION WORKS WITH `.find()`**
>
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** contain the specified tags

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .tags( [ "foo", "bar", "baz" ] )
  .then(function( err, makes ) {});

makeapi
  .tags({
    tags: [ "foo", "bar", "baz" ]
  })
  .then(function( err, makes ) {});

makeapi
  .tags({
    tags: [ "foo", "bar", "baz" ],
    execution: "or" // defaults to "and"
  })
  .then(function( err, makes ) {});
```

###`tagPrefix( prefix, not )`###

Add a filter to the search for the specified prefix. for example, this will match makes with the tag "applePie" if prefix is "apple"

>`prefix` - **required** - A string specifying the prefix you wish to filter for. i.e. It will match `"abc"` in `"abc:def"`
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** contain the specified prefix

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .tagPrefix( "apple" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// reverse the filter logic!
makeapi
  .tagPrefix( "apple", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`limit( num )`###

Sets the maximum number of results you want back from the Make API server. Defaults to 10

>`num` - **required** - A whole number, greater than 0. If the value is rejected, it will not set limit and fail silently.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .limit( 20 ) // it can also convert the string "20" to a number
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`page( num )`###

Request a specific page of results. If the page is too high to contain matched makes, an empty array is returned.

For Example: if a search is limited to 5 results but Elastic Search matched 10 makes, requesting page 2 would give you search hits numbered 5 to 9 (zero indexed)

>`num` - **required** - A whole number, greater than 0. If the value is rejected, it will not set limit and fail silently.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .page( 5 )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`sortByField( field, direction )`###

Sort the makes matched By Elastic Search using the specified field and direction. Can be called multiple times to add more than one sort field, with the first fields taking precedence.

>`field` - **required** -  A String matching one valid field of a make. i.e. "createdAt"
>`direction` - **optional** - a String, either "asc" or "desc", specifying ascending or descending sort, respectively. defaults to "asc"

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .sortByField( "updatedAt" )
  .then(function( err, makes ) {});

makeapi
  .sortByField( "createdAt", "desc" )
  .sortByField( "updatedAt", "asc" )
  .then(function( err, makes ) {});
```

###`url( makeUrl, not )`###

Filter makes for a specific URL. URL is unique for makes, so it will match one make only. The result will still always be an array.

>`makeUrl` - **required** - A String defining a url to filter on
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** contain the specified URL

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .url( "www.make.url.com/path/to/make.html" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`contentType( contentType, not )`###

Filter makes by contentType.

>`contentType` - **required** - A String defining a contentType to filter for
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** contain the specified content type

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .contentType( "application/x-thimble" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// reverse the filter logic!
makeapi
  .contentType( "application/x-thimble", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`remixedFrom( projectID, not )`###

Filter for makes remixed from the project that has the specified project id

>`projectID` - **required** - A String defining the project ID you are filtering for
>`not` - Boolean value that when set `true`, will force a filter for makes that **Are Not** remixed from a make with the specified ID

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .remixedFrom( someOtherMake.id )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// reverse the filter logic!
makeapi
  .remixedFrom( someOtherMake.id, true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`id( id, not )`###

Filter for a make with the specified ID

>`id` - **required** - A String defining the project ID you are filtering for
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** match the specified ID

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .id( "SomeMakesIDValue" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// reverse the filter logic!
makeapi
  .id( "someMakesIDValue", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`title( title, not )`###

Filter for makes matching the title - this is a full text search, so "Kittens" will match "I love Kittens!"

>`title` - **required** - A String defining the title search value
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** match the specified title

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .title( "application/x-thimble" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// reverse the filter logic!
makeapi
  .title( "application/x-thimble", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`description( description, not )`###

Filter for makes matching the description - this is a full text search, so "kittens and stuff" will match "a project about kittens and stuff!"

>`description` - **required** - A String defining the description search value
>`not` - Boolean value that when set `true`, will force a filter for makes that **Do Not** match the description

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .description( "kittens and stuff" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });

// reverse the filter logic!
makeapi
  .description( "Kittens and stuff", true )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`likedByUser( username )`###

Filter for makes that the given user has liked

>`username` - **required** - A String representing the username

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .likedByUser( "webmaker" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`or()`###

Changes the boolean logic applied to search filters from AND to OR

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .or()
  .description( "kittens and stuff" )
  .title( "chainsaws" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
  });
```

###`getRemixCounts()`###

Will tell the MakeAPI Server to hydrate each make's remix count value in the search results. NOTE: This option can increase the response time of the request.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .getRemixCounts()
  .tags( "makerparty" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    // handle success!
    console.log(makes[0].remixCount);
  });
```

## Search Results ##

The Client Library wraps each make result in some API sugar for easy use. Call the following functions on individual make search results. i.e. `makes[4].rawTags()`

###`appTags()`###

**Getter** - This function returns all application tags on a make. i.e. "webmaker.org:featured"

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }

    var appTags = makes[0].appTags();

    console.log( appTags );
  });
```

###`userTags()`###

**Getter** - This function returns all user tags on a make. i.e. "webmakeruser@domain.com:favourite"

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }

    var userTags = makes[0].userTags();

    console.log( userTags );
  });
```

###`rawTags()`###

**Getter** - This function returns all raw tags on a make. i.e. "kittens"

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }

    var rawTags = makes[0].rawTags();

    console.log( rawTags );
  });
```

###`taggedWithAny( tags )`###

Determine whether this make is tagged with any of the tags passed in

>`tags` - **required** - This can be a String or [ String ], and the logic is OR vs. AND for multiple.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .title( "Kittens" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    if( makes[0].taggedWithAny( ["kittens" ] ) ) {
      // it was tagged!
    }
  });
```

###`remixes( callback )`###

Get a list of other makes that were remixed from this make. The current make's URL is used as a key.

>`callback` a function to execute when the server responds to a search request. The function must accept two parameters: `( error, makes )` - if nothing went wrong, error will be falsy, and makes matching your search will be passed as the second parameter.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .title( "Kittens" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    makes[0].remixes(function( err, makes ) {
      // exactly like handling `then` callbacks
    });
  });
```

###`locales( callback )`###

Similar to remixes(), but filter out only those remixes that have a different locale (i.e., are localized versions of this make).

>`callback` a function to execute when the server responds to a search request. The function must accept two parameters: `( error, makes )` - if nothing went wrong, error will be falsy, and makes matching your search will be passed as the second parameter.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .title( "Kittens" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    makes[0].locales(function( err, makes ) {
      // exactly like handling `then` callbacks
    });
  });
```

###`original( callback )`###

Get the original make used to create this remix. Null is sent back in the callback if there was no original (not a remix)

>`callback` a function to execute when the server responds to a search request. The function must accept two parameters: `( error, makes )` - if nothing went wrong, error will be falsy, and makes matching your search will be passed as the second parameter.

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .title( "Kittens" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    makes[0].original(function( err, makes ) {
      // check for null!!
    });
  });
```

###`update( email, callback )`###

**Requires AUTH** - This function will attempt to update a make.

>`email` the email address of the maker updating the make
>`callback` a function to execute when the server completes or fails to update the make


####Example####
```
var makeapi = new Make( optionsObjWithAuth ); // this NEEDS auth

makeapi
  .title( "Kittens" )
  .then(function( err, makes ) {
    if ( err ) {
      // handle error case
    }
    var make = makes[0];
    make.title = "New Title";
    make.update(function( err, make ) {
      // handle results!
    });
  });
```

Each Wrapped Make will have the following attributes, which can be changed and then updated with the `update` method above:

+ url
+ contentType
+ locale
+ title
+ description
+ author
+ published
+ tags
+ thumbnail
+ username
+ remixedFrom
+ id
+ emailHash
+ createdAt
+ updatedAt

## Create, Update & Delete ##

These functions require auth (see constructor docs)

###`create( options, callback )`###

This function will attempt to create a make.

>`options` - **required** - An Object defining a make. it should have the following attributes
>
> + `maker` - **required** - The email address of the maker
> + `make` - **required** - An object representing a Make. See the list of make attributes above.
>
>`callback` - **required** - a function to execute when the server completes or fails to create the make


####Example####
```
var makeapi = new Make( optionsObjWithAuth ); // this NEEDS auth

makeapi
  .create({
    maker: "maker@makerland.org",
    make: theObjectDefiningTheMake
  }, function( err, newMake ) {
    if( err ) {
      // something went horribly wrong
    }
    // newMake is your shiny new make!
  });
```

###`update( id, options, callback )`###

This function will attempt to update a make.

** using the wrapped make update function documented above is recommended over this function **

>`id` - **required** - The ID of the make you want to update
>
>`options` - **required** - An object representing a Make. See the list of make attributes above.
>
>`callback` a function to execute when the server completes or fails to update the make


####Example####
```
var makeapi = new Make( optionsObjWithAuth ); // this NEEDS auth

makeapi
  .update(
    "idofthemakeiwanttoupdate",
    theObjectDefiningTheMake,
    function( err, updatedMake ) {
      if( err ) {
        // something went horribly wrong
      }
      // updatedMake is your updated make!
    }
  );
```

###`delete( id, callback )`###

This function will attempt to delete a make.

>`id` - **required** - The ID of the make you want to delete
>
>`callback` a function to execute when the server completes or fails to delete the make


####Example####
```
var makeapi = new Make( optionsObjWithAuth ); // this NEEDS auth

makeapi
  .delete(
    "idofthemakeiwanttoupdate",
    function( err, deletedMake ) {
      if( err ) {
        // something went horribly wrong
      }
      // the deleted make's data is in `deletedMake`
    }
  );
```

###`like( id, maker, callback )`###

This function will add the user to the target makes' like array.

>`id` - **required** - The ID of the make the user wants to like
>
>`maker` -- **required** The email address associated with the Webmaker account that is liking a make. It is up to the consumer application to verify that they are dealing with a logged in user before issuing this API call.
>
>`callback` A function to execute when the server completes or fails to mark the make as liked

####Example####
```
var makeapi = new Make( optionsObjWithAuth ); // this NEEDS auth

makeapi
  .like(
    "idofthemakeiwanttoupdate",
    function( err, updatedMake ) {
      if( err ) {
        // something went horribly wrong
      }
      // the make that was updated is in updatedMake
    }
  );
```

###`unlike( id, maker, callback )`###

This function will remove the user from the target makes' like array.

>`id` - **required** - The ID of the make the user wants to unlike
>
>`maker` - **required** - The email address associated with the Webmaker account which wishes to unlike a make. It is up to the consumer application to verify that they are dealing with a logged in user before issuing this API call.
>
>`callback` A function to execute when the server completes or fails to mark the make as unliked

####Example####
```
var makeapi = new Make( optionsObjWithAuth ); // this NEEDS auth

makeapi
  .unlike(
    "idofthemakeiwanttoupdate",
    function( err, updatedMake ) {
      if( err ) {
        // something went horribly wrong
      }
      // the make that was updated is in updatedMake
    }
  );
```

###`remixCount( id, options, callback )`###

This function will return the count of remixes for a given project in a given date range.

>`id` - **required** - The ID of the make
>
>`options` - An optional Object defining a make. it should have the following attributes
>
> + `from` - Unix style timestamp indicating the start date for the remix count query. If undefined, from is ignored.
> + `to` - Unix style timestamp indicating the end date for the remix count query. The server's current time is used if undefined.
>
>`callback` - **required** - A function to pass the result into

####Example####
```
var makeapi = new Make( optionsObj );

// count remixes of the given project made between 7 and 3 days ago
makeapi
  .remixCount(
    "idofthemake",
    {
      // 1 week ago
      from: Date.now() - ( 1000 * 60 * 60 * 24 * 7 )
      // three days ago
      to: Date.now() - ( 1000 * 60 * 60 * 24 * 3 )
    },
    function( err, result ) {
      if( err ) {
        // something went wrong
      }
      // Number of remixes!
      console.log( result.count );
    }
  );
```

###`createList( options, callback )`###

Creates an ordered Make list with the given options

>`options` - **required** - it should have the following attributes
>
> + `makes` - **required** - An Array of Make IDs
> + `userId` - **required** The Unique user ID of the webmaker creating the list
> + `title` - An optional title for the List - helps identifying the content of a list.
>
>`callback` - **required** - A function to pass the result into

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .createList(
    {
      makes: [ "123", "456", "789" ],
      userId: 12345
    },
    function( err, list ) {
      if( err ) {
        // something went wrong
      }
      // your new list!
      // NOTE: The list's makes will be represented as ID's in the response. To get the Make Data, request the list by ID using the GET route.
      console.log( list );
    }
  );
```

###`updateList( id, options, callback )`###

Updates a Make list with the given options

>`id` - **required** - ID of the list that is to updated
>
>`options` - **required** - It should have the following attributes
>
> + `userId` - **required** - The Unique user ID of the webmaker updating the list
> + `makes` - An Array of Make IDs
> + `title` - An optional title for the List - helps identifying the content of a list.
>
>`callback` - **required** - A function to pass the result into

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .updateList(
    "id-of-a-list",
    {
      userId: 12345,
      makes: [ "123", "456" ]
    },
    function( err, list ) {
      if( err ) {
        // something went wrong
      }
      // updated list successfully!
      // NOTE: The list's makes will be represented as ID's in the response. To get the Make Data, request the list by ID using the GET route.
      console.log( list );
    }
  );
```

###`removeList( id, userId, callback )`###

Deletes a Make list with the given options

>`id` - **required** - ID of the list that is to updated
>`userId` - **required** - The Unique user ID of the webmaker deleting the list
>`callback` - **required** - A function to pass the result into

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .updateList(
    "id-of-a-list",
    12345,
    function( err, list ) {
      if( err ) {
        // something went wrong
      }
      // deleted list successfully!
      console.log( list );
    }
  );
```

###`getList( id, callback, noWrap )`###

Get a Make list with the given ID

>`id` - **required** - ID of the list that is to retrieved
>`callback` - **required** - A function to pass the result into
>`noWrap` - optional boolean value. If set to true, the make data will not be passed through the wrap function of the makeapi-client

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .getList(
    "id-of-a-list",
    function( err, listData ) {
      if( err ) {
        // something went wrong
      }
      console.log( listData ); // wrapped list data!
    }
  ).getList(
    "id-of-another-list",
    function( err, listData ) {
      // unwrapped list data
    },
    true // noWrap is true!
  );
```

###`getListsByUser( userId, callback )`###

Get a Users lists

>`userId` - **required** - ID of the user whose lists are to be retrieved
>`callback` - **required** - A function to pass the result into

####Example####
```
var makeapi = new Make( optionsObj );

makeapi
  .getListsByUser(
    123,
    function( err, lists ) {
      if( err ) {
        // something went wrong
      }
      console.log( lists );
    }
  );
```
