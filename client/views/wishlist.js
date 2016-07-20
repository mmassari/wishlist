/* Function to check if view passed in is the current view */
function isCurrentView(v) {
  if (Session.get('currentView') === v) {
    return true;
  } else {
    return false;
  }
}

/* wishlist template onCreated */
Template.wishlist.onCreated(function() {
  this.searchQuery = new ReactiveVar('');
  this.limit = new ReactiveVar(10);
  this.wishlistCount = new ReactiveVar(0);

  this.autorun(() => {
    this.subscribe('wishlists.all', this.searchQuery.get(), this.limit.get());
    this.wishlistCount.set(Counts.get('wishlists.all'));

    // Show allWishlists view
    Session.set('currentView', 'allWishlists');
    Session.set('selectedWishlist', '');
  });
});

/* wishlist template helpers */
Template.wishlist.helpers({
  showAllWishlists: () => {
    return isCurrentView('allWishlists');
  },
  showSingleWishlist: () => {
    return isCurrentView('singleWishlist');
  },
  showAddWishlist: () => {
    return isCurrentView('addWishlist') || isCurrentView('editWishlist');
  },
  wishlists: () => {
    // Get all wishlist, recently posted ones first
    return Wishlist.find({}, {sort: {createdOn: -1 } });
  },
  hasMoreWishlists: () => {
    return Template.instance().limit.get() <= Template.instance().wishlistsCount.get();
  },
  formatDate: (date) => {
    let currDate = moment(new Date()),
        postedDate = moment(new Date(date));

    let diff = currDate.diff(postedDate, 'days');

    if (diff === 0 && currDate.day() === postedDate.day()) {
      return 'Today';
    } else if (diff < 30) {
      if (diff <= 1) {
        return '1 day ago';
      } else {
        return diff + ' days ago';
      }
    } else {
      return '30+ days ago';
    }
  },
  isAuthor: (author) => {
    return Meteor.userId() === author;
  }
});

/* wishlist template events */
Template.wishlist.events({
  'click [data-id=load-more]': (event, template) => {
    template.limit.set(template.limit.get() + 20);
  },
  'keyup [data-id=search-wishlists-query]': _.debounce((event, template) => {
    event.preventDefault();

    template.searchQuery.set(template.find('[data-id=search-wishlists-query]').value);
    template.limit.set(20);
  }, 300),
  'submit [data-id=search-wishlists-form]': (event, template) => {
    event.preventDefault();
  },
  'click #postWishlistButton': (event, template) => {
    Session.set('currentView', 'addWishlist');
  },
  'click .small-profile': (event, template) => {
    Session.set('selectedWishlist', event.currentTarget.id);
    Session.set('currentView', 'singleWishlist');
  },
  'click [data-id=edit-wishlist]': (event, template) => {
    event.stopPropagation();

    Session.set('selectedWishlist', event.currentTarget.parentNode.id);
    Session.set('currentView', 'editWishlist');
  },
  'click [data-id=remove-wishlist]': (event, template) => {
    event.stopPropagation();

    // Sweet Alert delete confirmation
    swal({
      title: 'Delete wishlist?',
      text: 'Are you sure that you want to delete this wishlist?',
      type: 'error',
      showCancelButton: true,
      closeOnConfirm: true,
      cancelButtonText: 'No',
      confirmButtonText: 'Yes, delete it!',
      confirmButtonColor: '#da5347'
    }, function() {
      // Get the id of the wishlist to be deleted
      let wishlistId = event.currentTarget.parentNode.id;

      // Make sure message exists
      let wishlist = Wishlist.findOne({ _id: wishlistId } );

      // If message exists
      if (wishlist) {
        // Remove selected wishlist
        Meteor.call('wishlists.remove', wishlistId, (error, result) => {
          if (error) {
            Bert.alert('wishlist couldn\'t be deleted.', 'danger', 'growl-top-right');
          } else {
            Bert.alert('wishlist deleted', 'success', 'growl-top-right');
          }
        });
      } else {
        Bert.alert('wishlist couldn\'t be deleted.', 'danger', 'growl-top-right');
      }
    });
  }
});

/* singlewishlist template helpers */
Template.singleWishlist.helpers({
  getSingleWishlist: () => {
    return Wishlist.findOne({ _id: Session.get('selectedWishlist') } );
  },
  formatDate: (date) => {
    return moment(date).format('MM/DD/YY');
  },
  notAuthor: (author) => {
    return Meteor.userId() !== author;
  }
});

/* singleWishlist template events */
Template.singleWishlist.events({
  'click .allWishlistButton': (event, template) => {
    Session.set('currentView', 'allWishlist');
  },
  'click #applyNowButton': (event, template) => {
    // Get wishlist details
    let currWishlist = Wishlists.findOne({ _id: Session.get('selectedWishlist') } ),
        authorName = Meteor.users.findOne({_id: currWishlist.author}).username,
        msg = "Hi, I'm interested in the wishlist you posted titled \"" + currWishlist.title + ".\"";

    // Send message to wishlist poster
    if (currWishlist.author && authorName) {
      Meteor.call('messages.insert', currWishlist.author, authorName, msg, (error, result) => {
        if (error) {
          Bert.alert(error.reason, 'danger', 'growl-top-right');
        } else {
          // Display success message and reset form values
          Bert.alert('Message sent to the Wishlist poster.', 'success', 'growl-top-right');

          Session.set('currentView', 'allWishlist');
        }
      });
    } else {
      Bert.alert('There was a problem sending the message.', 'danger', 'growl-top-right');
    }
  }
});

/* addWishlist template onRendered */
Template.addWishlist.onRendered(function() {
  $('[data-id=addWishlist-submit]').addClass('disabled');

  if (isCurrentView('editWishlist')) {
    let wishlistToEdit = Wishlists.findOne({ _id: Session.get('selectedWishlist') } );

    // Fill in fields with existing data
    $('[data-id=addWishlist-title]').val(wishlistToEdit.title);
    $('[data-id=addWishlist-location]').val(wishlistToEdit.location);
    $('[data-id=addWishlist-description]').val(wishlistToEdit.description);
    $('[data-id=addWishlist-responsibilities]').val(wishlistToEdit.responsibilities);
    $('[data-id=addWishlist-qualifications]').val(wishlistToEdit.qualifications);
    $('[data-id=addWishlist-schedule]').val(wishlistToEdit.schedule);

    // Keep track of original values
    Session.set('startingTitle', $('[data-id=addWishlist-title]').val());
    Session.set('startingLocation', $('[data-id=addWishlist-location]').val());
    Session.set('startingDescription', $('[data-id=addWishlist-description]').val());
    Session.set('startingResponsibilities', $('[data-id=addWishlist-responsibilities]').val());
    Session.set('startingQualifications', $('[data-id=addWishlist-qualifications]').val());
    Session.set('startingSchedule', $('[data-id=addWishlist-schedule]').val());

    // Change button text
    $('[data-id=addWishlist-submit]').prop('value', 'Save');
  } else if (isCurrentView('addWishlist')) {
    // Change button text
    $('[data-id=addWishlist-submit]').prop('value', 'Post');
  }
});

/* addWishlist template events */
Template.addWishlist.events({
  'click .allWishlistsButton': (event, template) => {
    Session.set('currentView', 'allWishlists');
  },
  'keyup [data-id=addWishlist-title], keyup [data-id=addWishlist-location], keyup [data-id=addWishlist-description], keyup [data-id=addWishlist-responsibilities], keyup [data-id=addWishlist-qualifications], change [data-id=addWishlist-schedule]': (event, template) => {
    if (isCurrentView('addWishlist')) {
      // If Wishlist title, location, and description sections have text enable the submit button, else disable it
      if (template.find('[data-id=addWishlist-title]').value.toString().trim() !== '' &&
      template.find('[data-id=addWishlist-location]').value.toString().trim() !== '' &&
      template.find('[data-id=addWishlist-description]').value.toString().trim() !== '') {
        $('[data-id=addWishlist-submit]').removeClass('disabled');
      } else {
        $('[data-id=addWishlist-submit]').addClass('disabled');
      }
    } else if (isCurrentView('editWishlist')) {
      // If any of the values have changed enable the save button, else disable it
      if (template.find('[data-id=addWishlist-title]').value.toString().trim() !== Session.get('startingTitle') ||
      template.find('[data-id=addWishlist-location]').value.toString().trim() !== Session.get('startingLocation') ||
      template.find('[data-id=addWishlist-description]').value.toString().trim() !== Session.get('startingDescription') ||
      template.find('[data-id=addWishlist-responsibilities]').value.toString().trim() !== Session.get('startingResponsibilities') ||
      template.find('[data-id=addWishlist-qualifications]').value.toString().trim() !== Session.get('startingQualifications') ||
      template.find('[data-id=addWishlist-schedule]').value !== Session.get('startingSchedule')) {
        $('[data-id=addWishlist-submit]').removeClass('disabled');
      } else {
        $('[data-id=addWishlist-submit]').addClass('disabled');
      }
    }
  },
  'submit [data-id=addWishlist-form]': (event, template) => {
    event.preventDefault();

    // Only continue if button isn't disabled
    if (!$('[data-id=addWishlist-submit]').hasClass('disabled')) {
      // Get values
      let title = template.find('[data-id=addWishlist-title]').value.toString().trim(),
          location = template.find('[data-id=addWishlist-location]').value.toString().trim(),
          schedule = template.find('[data-id=addWishlist-schedule] option:selected').text.trim(),
          description = template.find('[data-id=addWishlist-description]').value.toString().trim(),
          responsibilities = template.find('[data-id=addWishlist-responsibilities]').value.toString().trim(),
          qualifications = template.find('[data-id=addWishlist-qualifications]').value.toString().trim();

      if (isCurrentView('addWishlist')) {
        // Title, location and description should have text
        if (title && location && description) {
          Meteor.call('wishlists.post', title, location, schedule, description, responsibilities, qualifications, (error, result) => {
            if (error) {
              Bert.alert(error.reason, 'danger', 'growl-top-right');
            } else {
              // Display success message
              Bert.alert('Wishlist posted', 'success', 'growl-top-right');

              // Switch the to allWishlists view
              Session.set('currentView', 'allWishlists');
            }
          });
        } else {
          Bert.alert('Please enter a wishlist title.', 'danger', 'growl-top-right');
        }
      } else if (isCurrentView('editWishlist')) {
        // Update existing job
        Meteor.call('wishlists.update', Session.get('selectedWishlist'), title, location, schedule, description,
        responsibilities, qualifications, (error, result) => {
          if (error) {
            Bert.alert(error.reason, 'danger', 'growl-top-right');
          } else {
            // Display success message
            Bert.alert('Wishlist updated', 'success', 'growl-top-right');

            // Switch the to allWishlists view
            Session.set('currentView', 'allWishlists');
          }
        });
      }
    }
  }
});
