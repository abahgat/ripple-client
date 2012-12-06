var util      = require('util');
var webutil   = require('../client/webutil');
var Tab       = require('../client/tabmanager').Tab;
var id        = require('../client/id').Id.singleton;

var ContactsTab = function ()
{
  Tab.call(this);
};

util.inherits(ContactsTab, Tab);

ContactsTab.prototype.parent = 'account';

ContactsTab.prototype.generateHtml = function ()
{
  return require('../../jade/tabs/contacts.jade')();
};

ContactsTab.prototype.angular = function (module) {
  var app = this.app;
  var tm = this.tm;

  module.controller('ContactsCtrl', function ($scope)
  {
    // TODO need some refactoring to directly use $scope.userBlob

    $scope.name = '';
    $scope.address = '';

    $scope.updateData = function ()
    {
      $scope.addressbook = app.$scope.userBlob.data.contacts;
      $scope.addressbookmaster = angular.copy($scope.addressbook);
    };

    /**
     * Toggle "add contact" form
     */
    $scope.toggle_form = function ()
    {
      $scope.addform_visible = !$scope.addform_visible;
    };

    /**
     * Create contact
     */
    $scope.create = function ()
    {
      var contact = {
        name: $scope.name,
        address: $scope.address,
        // Used for animation
        justAdded: true
      };

      // Enable the animation
      $scope.enable_highlight = true;

      // Add an element
      $scope.addressbook.unshift(contact);

      // Update master
      $scope.addressbookmaster.unshift(contact);

      // Hide the form
      $scope.toggle_form();

      // Update blob
      $scope.userBlob.data.contacts = $scope.addressbookmaster;

      // Clear form
      $scope.name = '';
      $scope.address = '';
    };

    /**
     * Switch to edit mode
     *
     * @param index
     */
    $scope.edit = function (index)
    {
      $scope.addressbook[index].isEditMode = true;
    };

    /**
     * Update contact
     *
     * @param index
     */
    $scope.update = function (index)
    {
      delete $scope.addressbook[index].duplicateName;
      delete $scope.addressbook[index].duplicateAddress;
      delete $scope.addressbook[index].invalidAddress;

      var UInt160 = new ripple.UInt160();

      // TODO use "unique" and "address" directives
      // Validation
      for (var i = 0; i < $scope.addressbookmaster.length; i++) {
        if (i!=index && $scope.addressbookmaster[i].name == $scope.addressbook[index].name) {
          $scope.addressbook[index].duplicateName = true;
        }
        if (i!=index && $scope.addressbookmaster[i].address == $scope.addressbook[index].address) {
          $scope.addressbook[index].duplicateAddress = true;
        }
        else if(!UInt160.parse_json($scope.addressbook[index].address)._value) {
          $scope.addressbook[index].invalidAddress = true;
        }
        if ($scope.addressbook[index].duplicateName || $scope.addressbook[index].duplicateAddress || $scope.addressbook[index].invalidAddress) {
          return;
        }
      }

      $scope.addressbook[index].isEditMode = false;

      // Update master
      $scope.addressbookmaster[index] = $scope.addressbook[index];

      // Update blob
      $scope.userBlob.data.contacts = $scope.addressbookmaster;
    };

    /**
     * Remove contact
     *
     * @param index
     */
    $scope.remove = function (index) {
      $scope.addressbook.splice(index,1);

      // Update master
      $scope.addressbookmaster.splice(index,1);

      // Update blob
      $scope.userBlob.data.contacts = $scope.addressbookmaster;
    };

    /**
     * Cancel contact edit
     *
     * @param index
     */
    $scope.cancel = function (index)
    {
      $scope.addressbook[index] = {
        name: $scope.addressbookmaster[index].name,
        address: $scope.addressbookmaster[index].address,
        isEditMode: false
      };
    };

    $scope.send = function (index)
    {
      app.id.sendTo = $scope.addressbookmaster[index].address;

      document.location = '#send';
    }
  });

  /**
   * Contact name and address uniqueness validator
   */
  module.directive('rpUnique', function() {
    return {
      restrict: 'A',
      require: '?ngModel',
      link: function ($scope, elm, attr, ctrl) {
        if (!ctrl) return;

        var validator = function(value) {
          var duplicates = $.grep($scope.addressbook, function(e){ return e[elm[0].name] == value; });

          if (typeof duplicates == 'undefined' || duplicates.length === 0) {
            ctrl.$setValidity('rpUnique', true);
            return value;
          } else {
            ctrl.$setValidity('rpUnique', false);
            return;
          }
        };

        ctrl.$formatters.push(validator);
        ctrl.$parsers.unshift(validator);

        attr.$observe('rpUnique', function() {
          validator(ctrl.$viewValue);
        });
      }
    };
  });
};

module.exports = ContactsTab;
