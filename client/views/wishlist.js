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
  'click #load-more': (event, template) => {
    template.limit.set(template.limit.get() + 20);
  },
  
  'keyup #search-wishlists-query': _.debounce((event, template) => {
    event.preventDefault();

    template.searchQuery.set(template.find('#search-wishlists-query').value);
    template.limit.set(20);
  }, 300),
  'submit #search-wishlists-form': (event, template) => {
    event.preventDefault();
  },
  'click #postWishlistButton': (event, template) => {
    Session.set('currentView', 'addWishlist');
  },
  'click .small-profile': (event, template) => {
    Session.set('selectedWishlist', event.currentTarget.id);
    Session.set('currentView', 'singleWishlist');
  },
  'click #edit-wishlist': (event, template) => {
    event.stopPropagation();

    Session.set('selectedWishlist', event.currentTarget.parentNode.id);
    Session.set('currentView', 'editWishlist');
  },
  'click #remove-wishlist': (event, template) => {
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
  $('#addWishlist-submit').addClass('disabled');
  $('#addWishlist-expireDate').datepicker();

  if (isCurrentView('editWishlist')) {
    let wishlistToEdit = Wishlists.findOne({ _id: Session.get('selectedWishlist') } );

    // Fill in fields with existing data
    $('#addWishlist-title').val(wishlistToEdit.title);
    $('#addWishlist-description').val(wishlistToEdit.description);
    $('#addWishlist-image').val(wishlistToEdit.image);
    $('#addWishlist-private').val(wishlistToEdit.private);
    $('#addWishlist-expireDate').val(wishlistToEdit.expireDate);

    // Keep track of original values
    Session.set('startingTitle', $('#addWishlist-title').val());
    Session.set('startingDescription', $('#addWishlist-description').val());
    Session.set('startingImage', $('#addWishlist-image').val());
    Session.set('startingPrivate', $('input[name=addWishlist-private]:checked').val());
    Session.set('startingExpireDate', $('#addWishlist-expireDate').val());

    // Change button text
    $('#addWishlist-submit').prop('value', 'Save');
  } else if (isCurrentView('addWishlist')) {
    // Change button text
    $('#addWishlist-submit').prop('value', 'Post');
  }
});

/* addWishlist template events */
Template.addWishlist.events({
  'click .allWishlistsButton': (event, template) => {
    Session.set('currentView', 'allWishlists');
  },
  'keyup #addWishlist-title, keyup #addWishlist-description, change #addWishlist-image, change [name=addWishlist-private], keyup #addWishlist-expireDate': (event, template) => {
    if (isCurrentView('addWishlist')) {
      // If Wishlist title have text enable the submit button, else disable it
      if (template.find('#addWishlist-title').value.toString().trim() !== '') {
        $('#addWishlist-submit').removeClass('disabled');
      } else {
        $('#addWishlist-submit').addClass('disabled');
      }
    } else if (isCurrentView('editWishlist')) {
      // If any of the values have changed enable the save button, else disable it
      if (template.find('#addWishlist-title').value.toString().trim() !== Session.get('startingTitle') ||
      template.find('#addWishlist-description').value.toString().trim() !== Session.get('startingDescription') ||
      template.find('#addWishlist-image').value.toString().trim() !== Session.get('startingImage') ||
      template.find('input[name=addWishlist-private]:checked').value.toString().trim() !== Session.get('startingPrivate') ||
      template.find('#addWishlist-expireDate').value !== Session.get('startingExpireDate')) {
        $('#addWishlist-submit').removeClass('disabled');
      } else {
        $('#addWishlist-submit').addClass('disabled');
      }
    }
  },
  'submit #addWishlist-form': (event, template) => {
    event.preventDefault();

    // Only continue if button isn't disabled
    if (!$('#addWishlist-submit').hasClass('disabled')) {
      // Get values
      let title = template.find('#addWishlist-title').value.toString().trim(),
          description = template.find('#addWishlist-description').value.toString().trim(),
          image = template.find('#addWishlist-image').value.toString().trim(),
          private = template.find('input[name=addWishlist-private]:checked').value.trim(),
          expireDate = template.find('#addWishlist-expireDate').value.toString().trim();

      if (isCurrentView('addWishlist')) {
        // Title, location and description should have text
        if (title) {
          Meteor.call('wishlists.post', title, description, image, private, expireDate, (error, result) => {
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
