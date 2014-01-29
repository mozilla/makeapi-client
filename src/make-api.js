/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Shim module so we can safely check what environment this is being included in.
var module = module || undefined;

(function ( module ) {
  var API_PREFIX = "/api/20130724/make/";

  var Make,
      xhrStrategy,
      apiURL,
      credentials,
      auth,
      user,
      pass,
      csrfToken,
      request,
      hawk;

  function nodeStrategy( type, path, data, callback ) {
    // Only use auth if provided
    var authObj = ( user && pass ) ? {
          username: user,
          password: pass,
          sendImmediately: true
        } : undefined,
        requestOptions = {
          method: type,
          uri: path,
          json: data,
          headers: {}
        },
        header;

    if ( authObj ) {
      requestOptions.auth = authObj;
    } else if( credentials ) {
      header = hawk.client.header( path, type, { credentials: credentials } );
      requestOptions.headers.Authorization = header.field;
    }

    request( requestOptions, function( err, res, body ) {
      if ( err ) {
        return callback( err );
      }

      if ( credentials ) {
        if ( !hawk.client.authenticate( res, credentials, header.artifacts, { payload: JSON.stringify( body ) } ) ) {
          return callback( "Warning: The response does not authenticate - your traffic may be getting intercepted and modified" );
        }
      }
      if ( res.statusCode === 200 ) {
        callback( null, body );
      } else {
        // something went wrong, the body contains the details
        callback( body );
      }
    });
  }

  function browserStrategy( type, path, data, callback ) {
    var request = new XMLHttpRequest();

    if ( auth ) {
      request.open( type, path, true, user, pass );
    } else {
      request.open( type, path, true );
    }
    if ( csrfToken ) {
      request.setRequestHeader( "X-CSRF-Token", csrfToken ); // express.js uses a non-standard name for csrf-token
    }
    request.setRequestHeader( "Content-Type", "application/json; charset=utf-8" );
    request.onreadystatechange = function() {
      var response,
          error;
      if ( this.readyState === 4 ) {
        try {
          response = JSON.parse( this.responseText ),
          error = response.error;
        }
        catch ( exception ) {
          error = exception;
        }
        if ( error ) {
          callback( error );
        } else {
          callback( null, response );
        }
      }
    };
    request.send( JSON.stringify( data ) );
  }

  function doXHR( type, path, data, callback ) {

    if ( typeof data === "function" ) {
      callback = data;
      data = {};
    } else if ( typeof data === "string" ) {
      path = data.length ? path + "?" + data : path;
      data = {};
    }

    path = apiURL + path;

    xhrStrategy( type, path, data, callback );
  }

  // Extend a make with some API sugar.
  function wrap( make, options ) {

    function getMakeInstance() {
      if ( !getMakeInstance.instance ) {
        getMakeInstance.instance = Make( options );
      }
      return getMakeInstance.instance;
    }

    // Lazily extract various tags types as needed, and memoize.
    function lazyInitTags( o, name, regexp ) {
      delete o[ name ];
      var tags = [];
      make.tags.forEach( function( tag ) {
        if( regexp.test( tag ) ) {
          tags.push( tag );
        }
      });
      o[ name ] = tags;
      return tags;
    }

    var wrapped = {
      // Application Tags are "webmaker.org:foo", which means two
      // strings, joined with a ':', and the first string does not
      // contain an '@'
      get appTags() {
        return lazyInitTags( this, 'appTags', /^[^@]+\:[^:]+/ );
      },

      // User Tags are "some@something.com:foo", which means two
      // strings, joined with a ':', and the first string contains
      // an email address (i.e., an '@').
      get userTags() {
        return lazyInitTags( this, 'userTags', /^[^@]+@[^@]+\:[^:]+/ );
      },

      // Raw Tags are "foo" or "#fooBar", which means one string
      // which does not include a colon.
      get rawTags() {
        return lazyInitTags( this, 'rawTags', /^[^:]+$/ );
      },

      // Determine whether this make is tagged with any of the tags
      // passed into `tags`.  This can be a String or [ String ],
      // and the logic is OR vs. AND for multiple.
      taggedWithAny: function( tags ) {
        var any = false,
            all = make.tags;
        tags = Array.isArray( tags ) ? tags : [ tags ];
        for( var i = 0; i < tags.length; i++ ) {
          if ( all.indexOf( tags[ i ] ) > -1 ) {
            return true;
          }
        }
        return false;
      },

      // Get a list of other makes that were remixed from this make.
      // The current make's URL is used as a key.
      remixes: function( callback ) {
        callback = callback || function(){};
        getMakeInstance()
        .find({ remixedFrom: wrapped._id })
        .then( callback );
      },

      // Similar to remixes(), but filter out only those remixes that
      // have a different locale (i.e., are localized versions of this
      // make).
      locales: function( callback ) {
        callback = callback || function(){};
        this.remixes( function( err, results ) {
          if( err ) {
            callback( err );
            return;
          }
          var locales = [];
          results.forEach( function( one ) {
            if ( one.locale !== wrapped.locale ) {
              locales.push( one );
            }
          });
          callback( null, locales );
        });
      },

      // Get the original make used to create this remix. Null is sent
      // back in the callback if there was no original (not a remix)
      original: function( callback ) {
        callback = callback || function(){};
        if ( !wrapped.remixedFrom ) {
          callback( null, null );
          return;
        }
        getMakeInstance()
        .find({ _id: wrapped._id })
        .then( callback );
      },

      update: function( email, callback ) {
        callback = callback || function(){};
        getMakeInstance()
        .update( wrapped._id, wrapped, callback );
      }

    };

    // Extend wrapped with contents of make
    [ "url", "contentType", "locale", "title",
      "description", "author", "published", "tags", "thumbnail",
      "username", "remixedFrom", "_id", "emailHash", "createdAt",
      "updatedAt", "likes", "reports", "remixurl", "editurl" ].forEach( function( prop ) {
        wrapped[ prop ] = make[ prop ];
    });

    // Virtuals will only be exposed while still on the server end
    // forcing us to still manually expose it for client side users.
    wrapped.id = wrapped._id;

    return wrapped;
  }

  // Shorthand for creating a Make Object
  Make = function Make( options ) {
    // default search path - changed if Hawk credentials are provided
    var searchPath = "search";

    apiURL = options.apiURL;

    if ( options.hawk ) {
      credentials = options.hawk;
      searchPath = "protectedSearch";
    } else if ( options.auth ) {
      auth = options.auth.split( ":" );
      user = auth[ 0 ];
      pass = auth[ 1 ];
    }

    if ( options.csrf ) {
      csrfToken = options.csrf;
    }

    function addPair( queryPairs, key, val, not ) {
      val = val ? val.toString() : "";
      if ( !val.length ) {
        return this;
      }
      val = not ? "{!}" + val : val;
      queryPairs.push( encodeURIComponent( key ) + "=" + encodeURIComponent( val ) );
    }

    function mapAndJoinTerms( terms ) {
      return terms.map(function( val ) {
        return val.trim();
      }).join( "," );
    }

    function addArrayPair( queryPairs, options, field, not ){
      if ( options ) {
        var terms = options[ field ] || options,
            execution = options.execution || "and";
        if ( Array.isArray( terms ) ) {
          terms = mapAndJoinTerms( terms );
        } else {
          terms = mapAndJoinTerms( terms.split( "," ) );
        }
        terms = execution + "," + terms;
        addPair( queryPairs, field, terms, not );
      }
    }

    return {
      queryPairs: [],

      find: function( options ) {
        options = options || {};

        for ( var key in options ) {
          if ( options.hasOwnProperty( key ) && this[ key ] ) {
            if ( Array.isArray( options[ key ] ) ) {
              this[ key ].apply( this, options[ key ] );
            } else {
              this[ key ]( options[ key ] );
            }
          }
        }
        return this;
      },

      author: function( name, not ) {
        addPair( this.queryPairs, "author", name, not );
        return this;
      },

      user: function( id, not ) {
        addPair( this.queryPairs, "user", id, not );
        return this;
      },

      tags: function( options, not ) {
        addArrayPair( this.queryPairs, options, "tags", not );
        return this;
      },

      tagPrefix: function( prefix, not ) {
        addPair( this.queryPairs, "tagPrefix", prefix, not );
        return this;
      },

      url: function( url, not ) {
        addPair( this.queryPairs, "url", url, not );
        return this;
      },

      contentType: function( contentType, not ) {
        addPair( this.queryPairs, "contentType", contentType, not );
        return this;
      },

      remixedFrom: function( id, not ) {
        addPair( this.queryPairs, "remixedFrom", id, not );
        return this;
      },

      id: function( ids, not ) {
        if ( typeof ids === "string" ) {
          addPair( this.queryPairs, "id", ids, not );
        } else {
          // override execution to be "or"
          if ( Array.isArray( ids ) ) {
            ids = {
              id: ids,
              execution: "or"
            };
          } else {
            ids.execution = "or";
          }
          addArrayPair( this.queryPairs, ids, "id", not );
        }
        return this;
      },

      title: function( title, not ) {
        addPair( this.queryPairs, "title", title, not );
        return this;
      },

      description: function( desc, not ) {
        addPair( this.queryPairs, "description", desc, not );
        return this;
      },

      limit: function( num ) {
        addPair( this.queryPairs, "limit", num );
        return this;
      },

      page: function( num ) {
        addPair( this.queryPairs, "page", num );
        return this;
      },

      sortByField: function( field, direction ) {
        var sortOpts;
        if ( typeof field === "string" ) {
          sortOpts = field;
          sortOpts += "," + ( direction ? direction : "desc" );
          addPair( this.queryPairs, "sortByField", sortOpts );
          return this;
        }
        return this;
      },

      or: function() {
        addPair( this.queryPairs, "or", "1" );
        return this;
      },

      then: function( callback ) {
        var querystring = this.queryPairs.join( "&" );

        this.queryPairs = [];

        doXHR( "GET", API_PREFIX + searchPath,
          querystring,
          function( err, data ) {
            if ( err ) {
              return callback( err );
            }

            if ( !data ) {
              return callback( null, [], 0);
            }

            // Wrap resulting makes with some extra API.
            var hits = data.makes;
            for ( var i = 0; i < hits.length; i++ ) {
              hits[ i ] = wrap( hits[ i ], options );
            }
            callback( null, hits, data.total );
          }
        );
      },

      create: function create( options, callback ) {
        doXHR( "POST", API_PREFIX, options, callback );
        return this;
      },

      update: function update( id, options, callback ) {
        doXHR( "PUT", API_PREFIX + id, options, callback );
        return this;
      },

      like: function like( id, maker, callback ) {
        doXHR( "PUT", API_PREFIX + "like/" + id, { maker: maker }, callback );
        return this;
      },

      unlike: function update( id, maker, callback ) {
        doXHR( "PUT", API_PREFIX + "unlike/" + id, { maker: maker }, callback );
        return this;
      },

      remove: function remove( id, callback ) {
        doXHR( "DELETE", API_PREFIX + id, callback );
        return this;
      },

      autocompleteTags: function autocompleteTags( term, size, callback ) {
        if ( !callback && typeof size === "function" ) {
          callback = size;
          size = 10;
        }
        var query = "t=" + term + "&s=" + size;
        doXHR( "GET", API_PREFIX + "tags", query, callback );
        return this;
      },

      report: function report( id, maker, callback ) {
        doXHR( "PUT", API_PREFIX + "report/" + id, { maker: maker }, callback );
        return this;
      },

      cancelReport: function cancelReport( id, maker, callback ) {
        doXHR( "PUT", API_PREFIX + "cancelReport/" + id, { maker: maker }, callback );
        return this;
      },

      remixCount: function remixCount( id, options, callback ) {
        options = options || {};
        var from = options.from || "",
            to = options.to || "",
            qs = "id=" + id + "&from=" + from + "&to=" + to;

        doXHR( "GET", API_PREFIX + "remixCount", qs, callback );
        return this;
      }
    };
  };

  // Depending on the environment we need to export our "Make" object differently.
  if ( typeof module !== 'undefined' && module.exports ) {
    request = require( "request" );
    hawk = require( "hawk" );
    // npm install makeapi support
    xhrStrategy = nodeStrategy;
    module.exports = Make;
  } else {
    xhrStrategy = browserStrategy;
    if ( typeof define === "function" && define.amd ) {
      // Support for requirejs
      define(function() {
        return Make;
      });
    } else {
      // Support for include on individual pages.
      window.Make = Make;
    }
  }
}( module ));
