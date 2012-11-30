#solum.js

##Table of Contents
* [Purpose](#Purpose)
* [Organizing Your Code](#recommendations-for-organizing-your-code)
* [Services](#services)
 * [Ajax](#ajax)
 * [Validation](#validation)
 * [Translation](#translation)
* [Components](#components)
* [Entities](#entities)
* [Building a Page](#building-a-page)
* [SolumBundle](#solumbundle)

##Purpose

If you use Knockout.js and jQuery (or even if you don't), solum.js is designed to
make the rote tasks of development EASY.  It will help you manage your ajax
requests with dynamic routes as well as REST/POST parameters. It will also enable you 
to perform client-side validation on any number of fields with arbitrarily complex 
rules (caveat: you're building the validators for super-complex stuff).

solum.js is a set of javascript:
* *Services*
* *Components*
* *Entities*
 
The services draw heavily from the design of the Symfony2 framework and are meant to
make communication and view creation especially easy for users of Symfony2.  It's not
any harder for users of other frameworks to use solum.js, but the SolumBundle (Symfony2 
Bundle) has scaffolding, compilation, and testing commands that will make a Symfony2 
developer's life easier.

###What is a service?
A service is a wrapper for common tasks in your application that adds functionality or
abstraction that native libraries do not provide.  Currently solum.js has 4 services:

* AJAX Request Management
* Dynamic Client-Side Validation
* Client-Side Translation
* HTML5 Storage

Services are singleton objects that should be configured and then used on the page.  For
efficiency, services are not created until they are configured or called for the first time
(so don't call `solum.getService()` unless you mean it!).  After the initial call to `getService()`
subsequent calls will simply bring up the already created instance.

If you call `configureService()` it will instantiate (or reinstantiate) the service and serve that
object upon subsequent calls to getService(). Again, for the sake of efficiency (not that the
objects are very heavy...) if you don't need the service for that page, don't configure it!

###What is a Component?
The components defined in solum.js provide:
* Methods for manipulation of model 
* Properties/Methods to get status updates setup as ko observables or computed functions
* Will instantiate necessary Entities to hold data in the view

Some examples of reusable models available:
* Paginated Table
* Grouped List
* Date Range Widget with Drop Down Selections and Text Inputs

###What is an entity?

An entity is an object that represents a logical unit of data in your web application.  For example, you might
have a "user" entity that has the properties:

* First Name
* Last Name
* Email
* Phone
 
When you create a solum entity it should look like:

```javascript
solum.enities.user = function () {
  this.first_name = ko.observable('default value');
  this.last_name  = ko.observable('default value');
  this.email      = ko.observable('default value');
  this.phone      = ko.observable('default value');
      
  this.constraints = {
    first_name: []
    last_name: [],
    email: [],
    phone: [],
  };
};
```

All of the properties are created as observables so that there can be active two-way communication between
the view and the entity.

TBD: There will be a scaffolding task in the SolumBundle to create entities from Doctrine 2 PHP objects.

##Recommendations for Organizing Your Code
When adding your own javascript to extend the solum library, I recommend the following


##Services
###Usage
All services are requested through the `solum.getService([namespace], [name])` method.  This will instantiate
the service if it has not been called before or will pass you the existing instance if it already exists.

When using `solum.getService()` the default configurations are used if you have not previously configured
the service through `solum.configureService([namespace], [name], [config object])`.  The configure method will,
if the service has already been instantiated, replace that object with a new one with the proper configuration.

Each service has several configuration options, all of which are outlined below.


###Global Configuration
The one configuration setting that is global to solum is the user's `locale`.  The locale is used for 
translation and date/number format validation purposes.  Optionally it can be accessed and used to pass in
as a route parameter in the AJAX service.


###AJAX
The ajax manager is helpful as a wrapper around the jQuery ajax function.  It provides:

* __Dynamic route generation:__ Based on your MVC framework's routing system in a common JSON format
* __Concurrent request management:__ It will kill pending requests if not marked explicitly as simultaneous for that route to prevent strange user experiences where data changes on the screen unexpectedly.
* __Status updates:__ It provides convenience methods to track the status of requests to individual routes.


####Configuring the ajax manager
Below is a table of configuration options which can be called via:

```javascript
solum.configureService('ajax', 'manager', {
  prefix: '/beum/',
  badRequestHandler: function () {}, // 400 errors
  errorHandler: function () {} // All other 4XX or 5XX errors
});
```


<table>
  <thead>
    <tr>
      <th>Configuration Parameter</th>
      <th>Type</th>
      <th>Default</th>
      <th>Explanation</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>prefix</code></td>
      <td>string</td>
      <td><code>'/'</code></td>
      <td>
        <p>
          This string is prefixed on all URLs generated from routes to provide a way to call
          a specific alias or virtual host, especially when there are differences between your
          different environments.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>badRequestHandler</code></td>
      <td>function</td>
      <td><code>function () {}</code></td>
      <td>
        <p>
          Will receive and handle all responses that return with an HTTP status code of 400 (bad
          request) which we use for any validation failures.  The function should accept the arguments
          as <code>function (jqXHR, textStatus, errorThrown)</code> which is the same as the jQuery ajax
          error handler.  These errors primarily should be anticipated as normal validation errors and 
          should cause error messages to be displayed or something similar.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>errorHandler</code></td>
      <td>function</td>
      <td><code>function () {}</code></td>
      <td>
        <p>
          Will receive and handle all responses that return with an HTTP status code of 4XX or 5XX 
          these are unexpected failures and should be treated as such.
        </p>
      </td>
    </tr>
  </tbody>
</table>


####Routes
Routes are defined as follows:

```javascript
solum.addAjaxRoutes({
  linkshare_solum_demo_ajax_data: {
    name: "linkshare_solum_demo_ajax_data",
    url: "solum/demo/ajax-data/{type}",
    method: "GET",
    params: [
      { name: "type", defaultValue: "flat" }
    ]
  }
});
```

They are named (which should match the key used to identify them), they have a base URL structure, they
have an HTTP method (which will actually be used to make the request) and they have route parameters
that are embedded in the URL within the `{}` brackets.

The LinkShare SolumBundle actually has a commmand to generate a file with all of your routes for you to
make this easier.

####Generating URLs

You can generate a dynamic URL (if you are creating links on the fly) via the ajax manager's `generateURL()`
method.  It accepts the route name as a string and an object of parameters.  This allows you to rely on
your MVC framework for defining routes rather than hardcoding them.  To redefine routes (if you are using
the SolumBundle) it will be a simple commmand with no javascript/template changes.

```javascript
var url = ajaxManager.generateURL(routeName, params);
```

The `params` argument has 3 valid keys:

```javascript
var params = {
  routeData: {key: value}, // an object where the keys are the URL parameters to be replaced
  data: <anything>, // data to be passed through jQuery, for get it will be turned into REST params
                    // for post requests it will be turned into JSON in the body
  isSimultaneousRequest: true // Allow multiple concurrent ajax requests for this route
};
```


####Making Requests
Requests throught the AJAX manager are made through:

```javascript
ajaxManager.request(routeName, params, success);
```

The three parameters are the name of the route (as defined by your call to `solum.addAjaxRoutes()`),
params (as described above), and a success callback which will handle the parsed data.

The success callback should receive the data (body) from the response and do something with it.  jQuery
will transform JSON into a javascript object, but for any other formats (html, text) it will leave it
as-is.

A sample success callback might look like:

```javascript
var success = function (data) {
  this.table.empty();
  this.table.addItems(data);
};
```

####AJAX Request Status
In addition to making requests and generating URLs, the ajax manager will also keep track of its own status as
a KO Observable.  There are convenience KO Computed functions built off of this status that can be used to 
control loading symbols and the visibility of elements on the page which depend on the request.

```javascript
ajaxManager.isOK(routeName);         // true when there are no active requests and no requests have failed
ajaxManager.isLoading(routeName);    // true when at least one request is active for this route
ajaxManager.isFailed(routeName);     // true for any status code other than 400 in the 4XX or 5XX series
ajaxManager.isBadRequest(routeName); // true when 400 received on most recent request
```


###Validation
Validation is focused on being able to validate a solum entity.  It will take the entity and run through
the constraints on each property and the constraints on the entity to see if they pass.  In order to see how to 
define a solum entity, read the entity section below.

You can set up the entity to subscribe to changes on each of its properties and validate after every change, or you can
wait for certain landmark events like pushing a save/update button and give the user feedback then.  

Validate an entity by:

```javascript
var myEntity  = solum.getEntity('my_entity_name');
var validator = solum.getService('validation', 'validator');
if(!validator.isEntityValid(myEntity))) {
  // Do something about it
}

// After running validator.isEntityValid() the entity.hasError() will now respond with the latest
// attempt at validation

if(myEntity.hasError()) {
  // Do something about it
}

// And the errors for each property are ko.observableArray() properties, so if you have it bound
// in your template it will change
```

###Translation
WIP

###Storage
The HTML5 storage wrapper provides:
* Namespacing for saved objects
* Time To Live (TTL) for objects
* Choosing between session and local storage through configuration


##Components
Components literally components of a page.  They can and should be re-used where possible
and provide a wrapper around entities and add functionality to manipulate views based on
user interaction.

They also setup any KO subscriptions (especially around field changes) for the sake of 
validation or reloading of data within that component.

They are modular in nature, so new components can be added as the need arises.

###Tables
"Table" is very loosely defined here.  Anything that behaves like a list or paginated list
of information falls into the table namespace.

####Page
The page component is a wrapper around the typical page object.  It has many helper functions
that make it useful and easy to connect to your html view to provide for complex pagination.

#####Page Observable Properties
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Default Value</th>
      <th>Purpose</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>page.page()</code></td>
      <td>number</td>
      <td>1</td>
      <td>
        <p>
          The current page.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.totalPages()</code></td>
      <td>number</td>
      <td>0</td>
      <td>
        <p>
          Total number of pages.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.totalCount()</code></td>
      <td>number</td>
      <td>0</td>
      <td>
        <p>
          The current total count.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.pageSize()</code></td>
      <td>number</td>
      <td>25</td>
      <td>
        <p>
          Number of records per page.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.sortCol()</code></td>
      <td>number</td>
      <td>0</td>
      <td>
        <p>
          Index of the column to be sorted by.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.sortDir()</code></td>
      <td>string</td>
      <td>'A'</td>
      <td>
        <p>
          Sort direction, 'A' for ascending or 'D' for descending.
        </p>
      </td>
    </tr>
  </tbody>
</table>

#####Page Methods
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Purpose</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>page.onChange()</code></td>
      <td>
        <p>
          Will be triggered every time one of the page properties is changed.  Typical use case would
          be to trigger an ajax request to reload the page.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.getPage()</code></td>
      <td>
        <p>
          Getter for the page property.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.setPage(number)</code></td>
      <td>
        <p>
          Setter for the page property.  Triggers <code>page.onChange()</code> if the new page is not the
          same as the current page.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.first()</code></td>
      <td>
        <p>
          Shortcut for <code>page.setPage(1);</code>
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.next()</code></td>
      <td>
        <p>
          Increment page and trigger <code>page.onChange()</code>. Returns false when on the last page.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.previous()</code></td>
      <td>
        <p>
          Decrement page and trigger <code>page.onChange()</code>.  Returns false when on page 1.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.last()</code></td>
      <td>
        <p>
          Set page to the last page and trigger <code>page.onChange()</code>.  Returns false when already on the
          last page.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.setPageToFirstAndTriggerOnChange()</code></td>
      <td>
        <p>
          <code>page.first()</code> will not trigger the on change method if you are already on the first
          page.  This method guarantees that the page will be 1 and onChange will be called.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.getTotalPages()</code></td>
      <td>
        <p>
          Gets the total pages.  This is derived from the page size and total count.  There is no setter.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.getTotalCount()</code></td>
      <td>
        <p>
          Gets the total count.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.setTotalCount()</code></td>
      <td>
        <p>
          Sets the total count and changes the total pages.  Does not trigger the onChange callback because
          this would typically be called after the data is received.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.getPageSize()</code></td>
      <td>
        <p>
          Gets the page size.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.setPageSize()</code></td>
      <td>
        <p>
          Resets the page size and triggers onChange.  Resets the total page count based on the current total
          number of records.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.loadMore()</code></td>
      <td>
        <p>
          Increases the page size by the default page size.  Uses the <code>page.setPageSize()</code> so
          it will trigger <code>page.onChange()</code>. Returns false if the page size is already greater than
          the total count.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.hasMore()</code></td>
      <td>
        <p>
          Returns true if the page size is less than the total count.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.isFirstPage()</code></td>
      <td>
        <p>
          Returns true if this is page 1. Useful if you want to enable/disable first/last button.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.isNotFirstPage()</code></td>
      <td>
        <p>
          Returns true if this is not page 1. Useful if you want to enable/disable first/last button.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.isLastPage()</code></td>
      <td>
        <p>
          Returns true if this is the last page. Useful if you want to enable/disable first/last button.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.isNotLastPage()</code></td>
      <td>
        <p>
          Returns true if this is not the last page. Useful if you want to enable/disable first/last button.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.getSortCol()</code></td>
      <td>
        <p>
          Gets the index of the current sort column.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>page.setSortCol()</code></td>
      <td>
        <p>
          Sets the index of the current sort column and triggers <code>page.onChange()</code>.
        </p>
      </td>
    </tr>
  </tbody>
</table>

####Paginated Table
The paginated table is a very thin wrapper that combines a page object and an observable array
to create a paginated table.  There are a few convenience methods added to make things simpler.

#####Properties
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Default Value</th>
      <th>Purpose</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>table.list()</code></td>
      <td>observable array</td>
      <td>[]</td>
      <td>
        <p>
          An array of rows in the table.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>table.view</code></td>
      <td>object (not observable)</td>
      <td>N/A</td>
      <td>
        <p>
          Just a container for the knockout view functions in the foreach binding.  The three specific functions
          are: <code>table.view.afterRender()</code>, <code>table.view.afterAdd()</code>, and 
          <code>table.view.beforeRemove()</code>.  These are to be used in the foreach data bindings.
        </p>
      </td>
    </tr>
  </tbody>
</table>

#####Methods
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Purpose</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>table.addItem(item)</code></td>
      <td>
        <p>
          Adds the item to the array.  Item can be anything.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>table.addItems(arrayOfItems)</code></td>
      <td>
        <p>
          Appends all of the items to the current list.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>table.removeItems(key, value)</code></td>
      <td>
        <p>
          Remove item if the property specified by key, matches the value.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>table.empty()</code></td>
      <td>
        <p>
          Remove all elements in the observable array without destroying the
          array.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>table.reload(arrayOfItems)</code></td>
      <td>
        <p>
          Call <code>table.empty()</code> then <code>table.addItems(arrayOfItems)</code>.
        </p>
      </td>
    </tr>
  </tbody>
</table>

####Grouped List
The Grouped List component is focused on grouping a list of objects based on a specific property.  Any property that
is a primitive can be grouped by.  When the group by is null, then it will display under the single category of "null" 
(which you should make invisible) effectively simulating a flat list.

The problem this component is trying to simplify is to make categorizing a list effectively and allowing the user to
search through it quickly.

In the future I would like to add the ability to quick-filter a grouped list so you have the power to search very
quickly by filtering and grouping.

#####Properties
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Type</th>
      <th>Default Value</th>
      <th>Purpose</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>groupedList.table()</code></td>
      <td>paginatedTable object</td>
      <td>N/A</td>
      <td>
        <p>
          An instance of the paginatedTable object which controls the raw list.  This has all
          the same functions as a typical paginated table.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>groupedList.view</code></td>
      <td>object (not observable)</td>
      <td>N/A</td>
      <td>
        <p>
          Just a container for the knockout view functions in the foreach binding.  The three specific functions
          are: <code>groupedList.view.afterRender()</code>, <code>groupedList.view.afterAdd()</code>, and 
          <code>groupedList.view.beforeRemove()</code>.  These are to be used in the foreach data bindings.  The child
          paginatedTable object also has its own view object.  I think the top level view should be used to render the
          categories and the <code>groupedList.table.view</code> should be used to render the individual records.
        </p>
      </td>
    </tr>
  </tbody>
</table>

#####Methods
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Purpose</th>
    <tr>
  </thead>
  <tbody>
    <tr>
      <td><code>groupedList.setGroupBy(prop)</code></td>
      <td>
        <p>
          Resets the groupBy property and re-groups the list.
        </p>
      </td>
    </tr>
    <tr>
      <td><code>groupedList.groupItems()</code></td>
      <td>
        <p>
          Groups the items in the list by the groupBy property.
        </p>
      </td>
    </tr>
  </tbody>
</table>


####Tree

###Date Widget
The only thing in this category is...

###Creating a new component
WIP

##Entities
The entity framework is built around the concept that an entity is a container for properties with constraints
and errors associated with each of those properties.  The properties may be a primitive type or they may themselves
be sub-entities.

Every entity knows how to validate itself when necessary, and serialize itself to/from JSON to be passed between
a client and the server.

An entity is an object that represents a logical unit of data in your web application.  For example, you might
have a "user" entity that has the properties:

* First Name
* Last Name
* Email
* Phone
 
When you create a solum entity it should look like:

```javascript
solum.enities.user = function () {
  this.first_name = ko.observable('default value');
  this.last_name  = ko.observable('default value');
  this.email      = ko.observable('default value');
  this.phone      = ko.observable('default value');
      
  this.constraints = {
    first_name: []
    last_name: [],
    email: [],
    phone: [],
  };
};
```

As shown above, all you need to do to create an entity is do something similar to the block above, include
the file and instantiate the entity through:

```javascript
    var entity_instance = solum.getEntity('my_entity_name');
```

The `solum.getEntity()` method will add the validation and serialization properties to your object.


TBD: Not complete yet...

```javascript
    var myJson = myEntity.serialize();
    // send JSON somewhere
```

```javascript
    myEntity.hydrate(obj); // Some JS Object with same properties
```

##Building a Page
WIP

#SolumBundle
-------------------
The SolumBundle is a Symfony2 bundle that makes creating highly interactive and reusable
views within Syfmony2 easy and fun!

In addition to packaging the solum.js library, the SolumBundle provides the following:
* JS Lint javascript code quality viewer
* Mocha.js unit test coverage report command and viewer
* Examples of pages using services and reusable models.

##Installation
Add the following to your `[project]/deps` file:

    [SolumBundle]
        git=ssh://github.private.linksynergy.com/brandon-eum/SolumBundle.git
        target=/bundles/LinkShare/Bundle/SolumBundle

Add the following to your `[project]/app/AppKernel.php`

    new LinkShare\Bundle\SolumBundle\LinkShareSolumBundle()

Add the following to your `[project]/app/autoload.php`

    'LinkShare' => __DIR__.'/../vendor/bundles',

##Usage
###Demo Pages
A route to view an example paginated table:

    /solum/demo/paginated-table/

###Code Quality Pages
A route to view your javascript's compliance with JS Lint:

    /solum/test/jslint/

A route to view your javascript code coverage. First run the command:

    > php app/console solum:test:mocha:coverage

Then view the page:

    /solum/test/mocha/

Select a coverage report on the page and watch the magic happen!