module.exports = function (lib) {
  // Mocks to include
  var ko = require('../../mocks/mock-ko.js');
  var $  = require('../../mocks/mock-jquery.js');

  // Solum libraries to include
  var solum = require(lib + '/components/tables.js');

  // Fixture list data
  var item = {id: 0, hello:0, jello:0};
  var itemList =
  [
    {id: 1, hello:1, jello:1},
    {id: 2, hello:2, jello:2},
    {id: 3, hello:3, jello:2},
    {id: 4, hello:4, jello:4},
    {id: 5, hello:5, jello:4},
    {id: 6, hello:6, jello:6}
  ];

  var groupedList = [
    {
      property: 1,
        entries: [
        {id: 1, hello:1, jello:1}
      ]
    },
    {
      property: 2,
      entries: [
        {id: 2, hello:2, jello:2},
        {id: 3, hello:3, jello:2}
      ]
    },
    {
      property: 4,
      entries: [
        {id: 4, hello:4, jello:4},
        {id: 5, hello:5, jello:4}
      ]
    },
    {
      property: 6,
      entries: [
        {id: 6, hello:6, jello:6}
      ]
    },
  ];

  /**
   * Unit tests for paginated Table object
   */
  describe('solum:tables:paginatedTable',function() {
    describe('Preventin execution as a function and not as a constructor.', function () {
      it('Should return an instance of the paginated table even when called without "new"', function () {
        var table = solum.components.tables.paginatedTable();
        table.should.be.a("object");
        table.should.be.an.instanceof(solum.components.tables.paginatedTable);
      });
    });
    describe('Constructing a paginatedTable with the solum.getComponent method', function() {
      it('Should not require any arguments',function() {
        var table = solum.getComponent('tables', 'paginatedTable');
        table.list().should.have.length(0)
      })
      it('Should have a list property that is a ko.observableArray', function() {
        var table = solum.getComponent('tables', 'paginatedTable');
        table.list.isKoObservableArray.should.be.true;
      })
      it('Should have a page property that is an instance of solum.models.tables.page', function() {
        var table = solum.getComponent('tables', 'paginatedTable');
        table.page.should.be.an.instanceof(solum.components.tables.page);
      })
      describe('The "view" property', function(){
        it('Should have default functions for the afterRender, afterAdd, beforeRemove ko helpers', function() {
          var table = solum.getComponent('tables', 'paginatedTable');
          table.view.afterAdd.should.be.a("function");
          table.view.afterRender.should.be.a("function");
          table.view.beforeRemove.should.be.a("function");
        })
      })
    })
    describe('Adding items to the list', function(){
      describe('Using the addItem() method', function(){
        it('Should add the item to the list and increase the length by 1', function(){
          var table = solum.getComponent('tables', 'paginatedTable');
          table.addItem(item);
          table.list()[0].should.equal(item);
          table.list().should.have.length(1);
        })
      })
      describe('Using the addItems() method', function(){
        it('Should only accept an object', function(){
          var table = solum.getComponent('tables', 'paginatedTable');
          var a = function(){ table.addItems(itemList); };
          a.should.not.throw();

          a = function() { table.addItems(1); };
          a.should.throw();
          a = function() { table.addItems(true); };
          a.should.throw();
          a = function() { table.addItems(null); };
          a.should.throw();
          a = function() { table.addItems(); };
          a.should.throw();
          a = function() { table.addItems("afs"); };
          a.should.throw();
          a = function() { table.addItems(function(){}); };
          a.should.throw();
        })
        it('Should add all of the items from an object to the list', function(){
          var table = solum.getComponent('tables', 'paginatedTable');
          table.addItems(itemList);
          table.list().should.eql(itemList);
          table.list().length.should.eql(itemList.length);
        })
      })
    })
    describe('Clearing the list via the empty() method',function(){
      it('Should remove all elements from the list',function(){
        var table = solum.getComponent('tables', 'paginatedTable');
        table.addItems(itemList);
        table.list().should.eql(itemList);
        table.list().length.should.eql(itemList.length);

        table.empty();
        table.list().should.eql([]);
        table.list().length.should.eql(0);
      })
    })
    describe('Reloading the list via the reload() method', function () {
      it('Should empty the list and then add the items passed in', function () {
        var table = solum.getComponent('tables', 'paginatedTable');
        table.list().should.eql([]);
        table.list().length.should.eql(0);

        table.reload(itemList);
        table.list().should.eql(itemList);
        table.list().length.should.eql(itemList.length);
      });
    });
    describe('Removing an item via removeItems', function(){
      it('Should remove all items for which the key matches the value', function(){
        var table = solum.getComponent('tables', 'paginatedTable');
        var l     = itemList.slice(0);
        table.addItems(l);
        table.list().should.eql(itemList);
        table.list().length.should.eql(itemList.length);

        table.removeItems('id', 2);
        table.list().length.should.eql(itemList.length - 1);

        table.removeItems('jello', 4);
        table.list().length.should.eql(itemList.length - 3);
      })
      it('Should not throw an error when the key to test items against does not exist', function() {
        var table = solum.getComponent('tables', 'paginatedTable');
        table.addItems(itemList);
        var a = function() { table.removeItems('marcus', 2); };
        a.should.not.throw();
      })
      it('Should not remove any items when the key to test items against does not exist', function(){
        var table = solum.getComponent('tables', 'paginatedTable');
        table.addItems(itemList);
        table.removeItems('marcus', 2);
        table.list().length.should.eql(itemList.length);
      })
    })
  });


  /**
   * Unit tests for the groupedList object
   */
  describe('solum:tables:groupedList',function() {
    describe('Preventin execution as a function and not as a constructor.', function () {
      it('Should return an instance of the object even when called without "new"', function () {
        var table = solum.components.tables.groupedList();
        table.should.be.a("object");
        table.should.be.an.instanceof(solum.components.tables.groupedList);
      });
    });
    describe('Constructing a grouped list with the solum.getComponent method', function() {
      it('Should not require any arguments',function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.table.list().should.have.length(0);
        list.groupedList().should.have.length(0);
      });
      it('Should have a list property that is a ko.observableArray', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.groupedList.isKoObservableArray.should.be.true;
      });
      it('Should have a page property that is an instance of solum.components.tables.paginatedTable', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.table.should.be.an.instanceof(solum.components.tables.paginatedTable);
      });
    })
    describe('The "view" property', function(){
      it('Should have default functions for the afterRender, afterAdd, beforeRemove ko helpers', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.view.afterAdd.should.be.a("function");
        list.view.afterRender.should.be.a("function");
        list.view.beforeRemove.should.be.a("function");
      });
    });
    describe('groupedList.setGroupBy()', function() {
      it('Should set the groupBy field and re-group items', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.table.addItems(itemList);
        list.setGroupBy('jello');
        list.groupedList().length.should.equal(4);

        list.setGroupBy('id');
        list.groupedList().length.should.equal(6);
      });
    });
    describe('groupedList.groupItems()', function() {
      it('Should group the list based on the groupBy property', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.table.addItems(itemList);
        list.setGroupBy('jello');

        var grouped = list.groupedList();
        var found   = false;

        for(var i in grouped) {
          found = false;
          for(var j in groupedList) {
            if(grouped[i].property == groupedList[j].property) {
                grouped[i].entries.length.should.eql(groupedList[j].entries.length);
                found = true;
            }
          }

          if(!found) {
            throw "An expected property was not found: " + grouped[i].property;
          }
        }
      });
      it('Should put all items into the "null" group if groupBy is not defined', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.table.addItems(itemList);
        list.setGroupBy(null);
        var grouped = list.groupedList();
        var isNull  = (grouped[0].property === null)

        isNull.should.be.true;
        grouped[0].entries.length.should.eql(itemList.length);
      });
      it('Should throw an error if the group by property does not exist on one or more objects', function() {
        var list = solum.getComponent('tables', 'groupedList');
        list.table.addItems(itemList);
        var a = function () { list.setGroupBy('amazing'); };
        a.should.throw();
      });
    });
  });

  /**
   * Unit tests for the page object
   */
  describe('solum:tables:page',function() {
    describe('Preventin execution as a function and not as a constructor.', function () {
      it('Should return an instance of the object even when called without "new"', function () {
        var page = solum.components.tables.page();
        page.should.be.a("object");
        page.should.be.an.instanceof(solum.components.tables.page);
      });
    });
    describe('Constructing a page with the solum.getComponent method', function() {
      it('Should not require any arguments',function() {
        var page = solum.getComponent('tables', 'page');
        page.page().should.equal(1);
      });
      it('Should default to page 1, total rows of 0, with size 25, and sort on 0 ascending', function() {
        var page = solum.getComponent('tables', 'page');
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0);
        page.getPageSize().should.eql(25);
        page.getSortCol().should.eql(0);
        page.getSortDir().should.eql('A');
      });
    });
    describe('page.setPage()', function() {
      it('Should only accept a number', function () {
        var page = solum.getComponent('tables', 'page');
        var sp = page.setPage;
        
        var f = function () { page.setPage(1); }
        f.should.not.throw();

        f = function () { sp(); }
        f.should.throw();
        f = function () { sp('a'); }
        f.should.throw();
        f = function () { sp(true); }
        f.should.throw();
        f = function () { sp(false); }
        f.should.throw();
        f = function () { sp(null); }
        f.should.throw();
        f = function () { sp({}); }
        f.should.throw();
      });
      it('Should change the page number if it is between 1 and the total number of pages', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.setPage(2);
        page.getPage().should.eql(2);
      });
      it('Should return false if the page number is less than 1 or greater than the total or equal to the current page', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        var t = page.setPage(0);
        t.should.be.false;
        t = page.setPage(-1);
        t.should.be.false;
        t = page.setPage(5);
        t.should.be.false;
        t = page.setPage(1);
        t.should.be.false;
      });
      it('Should execute the onChange method when the page changes', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        page.setTotalCount(100);
        page.onChange = onChange;
        
        page.setPage(0);
        isCalled.should.be.false;
        page.setPage(1);
        isCalled.should.be.false;
        page.setPage(5);
        isCalled.should.be.false;
        page.setPage(2);
        isCalled.should.be.true;
      });
    });
    describe('page.first()', function() {
      it('Should set the page to 1', function () {
        var page = solum.getComponent('tables', 'page');
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(3);
        
        // Validate that the first() method works
        page.first();
        page.getPage().should.eql(1);
      });
      it('Should trigger the onChange callback if the page is not 1', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        page.onChange = onChange;
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(3);
        
        // Validate that the first() method works
        page.first();
        page.getPage().should.eql(1);
        isCalled.should.be.true;
      });
      it('Should return false if the page is 1', function () {
        var page = solum.getComponent('tables', 'page');
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Set the page to 1 when it is already 1
        var test = page.first();
        test.should.be.false;
      });
    });
    describe('page.previous()', function() {
      it('Should decrement the page by 1 and call the onChange callback', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        page.onChange = onChange;
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(3);
        
        // Validate that the first() method works
        page.previous();
        page.getPage().should.eql(2);
        isCalled.should.be.true;
      });
      it('Should return false if the page is 1', function () {
        var page = solum.getComponent('tables', 'page');
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Set the page to 1 when it is already 1
        var test = page.previous();
        test.should.be.false;
      });
    });
    describe('page.next()', function() {
      it('Should decrement the page by 1 and call the onChange callback', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        page.onChange = onChange;
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(2);
        
        // Validate that the first() method works
        page.next();
        page.getPage().should.eql(3);
        isCalled.should.be.true;
      });
      it('Should return false if the page is the last page', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(4);
        
        // Validate that the first() method works
        page.onChange = onChange;
        var test = page.next();
        test.should.be.false;
        page.getPage().should.eql(4);
        isCalled.should.be.false;
      });
    });
    describe('page.last()', function() {
      it('Should decrement the page by 1 and call the onChange callback', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        page.onChange = onChange;
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(2);
        
        // Validate that the first() method works
        page.last();
        page.getPage().should.eql(4);
        isCalled.should.be.true;
      });
      it('Should return false if the page is the last page', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(4);
        
        // Validate that the first() method works
        page.onChange = onChange;
        var test = page.last();
        test.should.be.false;
        isCalled.should.be.false;
      });
    });
    describe('page.setPageToFirstAndTriggerOnChange()', function() {
      it('Should set the page to the first page', function () {
        var page = solum.getComponent('tables', 'page');
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(3);
        
        // Validate that the first() method works
        page.setPageToFirstAndTriggerOnChange();
        page.getPage().should.eql(1);
      });
      it('Should always trigger the onChange callback', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        
        // Check the default values
        page.getPage().should.eql(1);
        page.getTotalCount().should.eql(0)
        page.getPageSize().should.eql(25);
        
        // Reset the total count and page
        page.setTotalCount(100);
        page.setPage(4);
        
        // Validate that the first() method works
        page.onChange = onChange;
        page.setPageToFirstAndTriggerOnChange();
        page.getPage().should.eql(1);
        isCalled.should.be.true;
        
        // Test when page is 1
        isCalled = false;
        page.setPageToFirstAndTriggerOnChange();
        isCalled.should.be.true;
      });
    });
    describe('page.getTotalPages()', function() {
      it('Should return the total number of pages', function () {
        var page = solum.getComponent('tables', 'page');
        page.getTotalPages().should.eql(0);
        
        page.setTotalCount(100);
        page.getTotalPages(4);
      });
    });
    describe('page.getTotalCount()', function() {
      it('Should return the total row count', function () {
        var page = solum.getComponent('tables', 'page');
        page.getTotalCount().should.eql(0);
        page.setTotalCount(100);
        page.getTotalCount(100);
      });
    });
    describe('page.setTotalCount()', function() {
      it('Should only accept a number', function () {
        var page = solum.getComponent('tables', 'page');
        var sp = page.setTotalCount;
        
        var f = function () { sp(1); }
        f.should.not.throw();

        f = function () { sp(); }
        f.should.throw();
        f = function () { sp('a'); }
        f.should.throw();
        f = function () { sp(true); }
        f.should.throw();
        f = function () { sp(false); }
        f.should.throw();
        f = function () { sp(null); }
        f.should.throw();
        f = function () { sp({}); }
        f.should.throw();
      });
      it('Should set the number of rows and reset the page count based on the page size', function () {
        var page = solum.getComponent('tables', 'page');
        page.getTotalPages(0);
        page.getPageSize().should.eql(25);
        page.setTotalCount(100);
        page.getTotalPages(4);
      });
    });
    describe('page.defaultPageSize', function() {
      it('Should be 25', function () {
        var page = solum.getComponent('tables', 'page');
        page.defaultPageSize.should.be.eql(25);
      });
    });
    describe('page.getPageSize()', function() {
      it('Should return the current page size', function () {
        var page = solum.getComponent('tables', 'page');
        page.getPageSize().should.be.eql(25);
        page.setPageSize(10);
        page.getPageSize().should.be.eql(10);
      });
    });
    describe('page.setPageSize()', function() {
      it('Should only accept a number', function () {
        var page = solum.getComponent('tables', 'page');
        var sp = page.setPageSize;
        
        var f = function () { sp(1); }
        f.should.not.throw();

        f = function () { sp(); }
        f.should.throw();
        f = function () { sp('a'); }
        f.should.throw();
        f = function () { sp(true); }
        f.should.throw();
        f = function () { sp(false); }
        f.should.throw();
        f = function () { sp(null); }
        f.should.throw();
        f = function () { sp({}); }
        f.should.throw();
      });
      it('Should set the current page size and reset the total number of pages', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPageSize().should.eql(25);
        page.getTotalPages().should.eql(4);
        page.setPageSize(50);
        page.getPageSize().should.eql(50);
        page.getTotalPages().should.eql(2);
      });
      it('Should execute the onChange function', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };
        page.setTotalCount(100);
        page.onChange = onChange;
        page.setPageSize(50);
        isCalled.should.be.true;
        isCalled = false;
        page.setPageSize(50);
        isCalled.should.be.false;
      });
    });
    describe('page.loadMore()', function() {
      it('Should increment the page size by the default page size', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPageSize().should.eql(25);
        page.defaultPageSize.should.eql(25);
        page.loadMore();
        page.getPageSize().should.eql(50);
        page.defaultPageSize = 10;
        page.loadMore();
        page.getPageSize().should.eql(60);
      });
      it('Should return false if the current page size is already greater than or equal to the total count', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(50);
        page.getPageSize().should.eql(25);
        page.defaultPageSize.should.eql(25);
        page.loadMore();
        page.getPageSize().should.eql(50);
        var t = page.loadMore();
        t.should.be.false;
      });
    });
    describe('page.hasMore()', function() {
      it('Should be a ko computed that returns a bool indicating if the page size is less than the total', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPageSize().should.eql(25);
        page.hasMore().should.be.true;
        page.setPageSize(100);
        page.hasMore().should.be.false;
      });
    });
    describe('page.isFirstPage()', function() {
      it('Should be a ko computed that indicates if the page is one', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPage().should.eql(1);
        page.isFirstPage().should.be.true;
        page.setPage(2);
        page.getPage().should.eql(2);
        page.isFirstPage().should.be.false;
        page.setPage(1);
        page.getPage().should.eql(1);
        page.isFirstPage().should.be.true;
      });
    });
    describe('page.isNotFirstPage()', function() {
      it('Should be a ko computed that indicates if the page is not one', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPage().should.eql(1);
        page.isNotFirstPage().should.be.false;
        page.setPage(2);
        page.getPage().should.eql(2);
        page.isNotFirstPage().should.be.true;
        page.setPage(1);
        page.getPage().should.eql(1);
        page.isNotFirstPage().should.be.false;
      });
    });
    describe('page.isLastPage()', function() {
      it('Should be a ko computed that indicates if the page is the last page', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPage().should.eql(1);
        page.isLastPage().should.be.false;
        page.setPage(4);
        page.getPage().should.eql(4);
        page.isLastPage().should.be.true;
        page.setPage(1);
        page.getPage().should.eql(1);
        page.isLastPage().should.be.false;
      });
    });
    describe('page.isNotLastPage()', function() {
      it('Should be a ko computed that indicates if the page is not the last page', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        page.getPage().should.eql(1);
        page.isFirstPage().should.be.true;
        page.setPage(2);
        page.getPage().should.eql(2);
        page.isFirstPage().should.be.false;
        page.setPage(1);
        page.getPage().should.eql(1);
        page.isFirstPage().should.be.true;
      });
    });
    describe('page.getSortCol()', function() {
      it('Should return the current sort column', function () {
        var page = solum.getComponent('tables', 'page');
        page.getSortCol().should.eql(0);
        page.setSortCol(1);
        page.getSortCol().should.eql(1);
      });
    });
    describe('page.setSortCol()', function() {
      it('Should only accept a number', function () {
        var page = solum.getComponent('tables', 'page');
        var sp = page.setSortCol;
        
        var f = function () { sp(1); }
        f.should.not.throw();

        f = function () { sp(); }
        f.should.throw();
        f = function () { sp('a'); }
        f.should.throw();
        f = function () { sp(true); }
        f.should.throw();
        f = function () { sp(false); }
        f.should.throw();
        f = function () { sp(null); }
        f.should.throw();
        f = function () { sp({}); }
        f.should.throw();
      });
      it('Should set the current sort column', function () {
        var page = solum.getComponent('tables', 'page');
        page.getSortCol().should.eql(0);
        page.setSortCol(1);
        page.getSortCol().should.eql(1);
      });
      it('Should execute the onChange function', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };

        // Validate that the first() method works
        page.onChange = onChange;
        page.getSortCol().should.eql(0);
        page.setSortCol(1);
        isCalled.should.be.true;
      })
    });
    describe('page.getSortDir()', function() {
      it('Should return the current sort direction', function () {
        var page = solum.getComponent('tables', 'page');
        page.getSortDir().should.eql('A');
        page.setSortDir('D');
        page.getSortDir().should.eql('D');
      });
    });
    describe('page.setSortDir()', function() {
      it('Should only accept "A" or "D"', function () {
        var page = solum.getComponent('tables', 'page');
        var sp = page.setSortDir;
        
        var f = function () { sp('A'); }
        f.should.not.throw();
        f = function () { sp('D'); }
        f.should.not.throw();

        f = function () { sp(); }
        f.should.throw();
        f = function () { sp(1); }
        f.should.throw();
        f = function () { sp(true); }
        f.should.throw();
        f = function () { sp(false); }
        f.should.throw();
        f = function () { sp(null); }
        f.should.throw();
        f = function () { sp({}); }
        f.should.throw();
      });
      it('Should set the current sort direction', function () {
        var page = solum.getComponent('tables', 'page');
        page.getSortDir().should.eql('A');
        page.setSortDir('D');
        page.getSortDir().should.eql('D');
      });
      it('Should execute the onChange function', function () {
        var page = solum.getComponent('tables', 'page');
        var isCalled = false;
        var onChange = function () {
          isCalled = true;  
        };

        // Validate that the first() method works
        page.onChange = onChange;
        page.setSortDir('D');
        isCalled.should.be.true;
      })
    });
    describe('page.toggleSort()', function() {
      it('Should toggle the current sort direction if the column specified is already the sort column', function () {
        var page = solum.getComponent('tables', 'page');
        page.toggleSort(0);
        page.getSortCol().should.eql(0);
        page.getSortDir().should.eql('D')
        page.toggleSort(0);
        page.getSortCol().should.eql(0);
        page.getSortDir().should.eql('A')
      });
      it('Should set the sort column and set the direction to "A" if not the current sort column', function () {
        var page = solum.getComponent('tables', 'page');
        page.toggleSort(1);
        page.getSortCol().should.eql(1);
        page.getSortDir().should.eql('A')
        page.toggleSort(2);
        page.getSortCol().should.eql(2);
        page.getSortDir().should.eql('A')
      })
    });
    describe('page.toObj()', function() {
      it('Should serialize itself to an object with a start/end/total rows and the sort col/direction', function () {
        var page = solum.getComponent('tables', 'page');
        page.setTotalCount(100);
        var res = {
          start_row:      1,
          end_row:        25,
          sort_col:       0,
          sort_direction: 'A'
        };
        page.toObj().should.eql(res);
      });
    });
    describe('page.fromObj()', function() {
      it('Should only accept an object with an "EndRow" and "TotalRows" parameters and should set the total count and page', function () {
        var page = solum.getComponent('tables', 'page');
        page.getTotalCount().should.eql(0);
        page.getPage().should.eql(1);
        var obj = {EndRow: 50, TotalRows: 100};
        
        var sp = page.fromObj;
        
        var f = function () { sp(obj); }
        f.should.not.throw();

        f = function () { sp(); }
        f.should.throw();
        f = function () { sp(1); }
        f.should.throw();
        f = function () { sp(true); }
        f.should.throw();
        f = function () { sp(false); }
        f.should.throw();
        f = function () { sp(null); }
        f.should.throw();
        f = function () { sp('a'); }
        f.should.throw();
        
        page.fromObj(obj)
        page.getTotalCount().should.eql(100);
        page.getPage().should.eql(2);
      });
    });
  });
  
  var rawTree = [
    '/home/beum/testfile.js',
    '/home/optimus/othertest.js'
  ];
  
  var processedTree = {
    home: {
      beum: {"testfile.js": '/home/beum/testfile.js'},
      optimus: {"othertest.js": '/home/optimus/othertest.js'}
    }
  };

  /**
   * Unit tests for tree object
   */
  describe('solum:tables:tree',function() {
    describe('Preventing execution as a function and not as a constructor.', function () {
      it('Should return an instance of the paginated table even when called without "new"', function () {
        var tree = solum.components.tables.tree();
        tree.should.be.a("object");
        tree.should.be.an.instanceof(solum.components.tables.tree);
      });
    });
    describe('The reset() method', function () {
      it('Should set the hierarchy property to an empty object', function () {
        var tree = solum.getComponent('tables', 'tree');
        tree.addItems(rawTree);
        tree.hierarchy().should.eql(processedTree);
        tree.reset();
        tree.hierarchy().should.eql({});
      });
    });
    describe('The addItems() method', function () {
      it('Should add items to the internal list and rebuild the hierarchy', function () {
        var tree = solum.getComponent('tables', 'tree');
        tree.addItems(rawTree);
        tree.raw.list().length.should.eql(2);
        tree.hierarchy().should.eql(processedTree);
      }); 
    });
    describe('The createHierarchyFromRawList() method', function () {
      it('Should take a list of filepath strings and create a hierarchy', function () {
        var tree = solum.getComponent('tables', 'tree');
        tree.addItems(rawTree);
        tree.raw.list().length.should.eql(2);
        tree.hierarchy().should.eql(processedTree);
        tree.reset();
        tree.hierarchy().should.eql({});
        tree.createHierarchyFromRawList();
        tree.hierarchy().should.eql(processedTree);
      });
    });
  });
}