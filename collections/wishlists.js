Wishlists = new Mongo.Collection('wishlists');

Meteor.methods({
  'wishlists.post': (title, description, image, private, expireDate) => {
    check(title, String);
    check(description, String);
    check(image, String);
    check(private, Boolean);
    check(expireDate, Date);

    // Verify that user is logged in
    if (!Meteor.user()) {
      throw new Meteor.Error(401, 'You need to be signed in to continue');
    }

    // Verify that required fields are empty
    if (!title) {
      throw new Meteor.Error(422, 'wishlist title should not be blank');
    }

    // Create job object to be inserted into DB
    let wishlist = {
      title: title,
      description: description,
      image: image,
      private: private,
      expireDate: expireDate,
      owner: Meteor.userId(),
      createdOn: new Date()
    };

    // Insert new job
    return Wishlists.insert(wishlist);
  },
  'wishlists.remove': (wishlistId) => {
    check(wishlistId, String);

    // Verify that user is logged in
    if (!Meteor.user()) {
      throw new Meteor.Error(401, 'You need to be signed in to continue');
    }

    // Verify that job exists
    if (Wishlists.find({_id: wishlistId}).count() === 0) {
      throw new Meteor.Error(111, 'Not a valid wishlist');
    }

    // Remove job by jobId
    return Wishlists.remove({_id: wishlistId});
  },
  'wishlists.update':(wishlistId, title, description, image, private, expireDate) => {
    check(title, String);
    check(description, String);
    check(image, String);
    check(private, Boolean);
    check(expireDate, Date);

    // Verify that user is logged in
    if (!Meteor.user()) {
      throw new Meteor.Error(401, 'You need to be signed in to continue');
    }

    // Verify that required fields are empty
    if (!title) {
      throw new Meteor.Error(422, 'wishlist title should not be blank');
    }

    // Verify that job exists
    if (Wishlists.find({_id: wishlistId}).count() === 0) {
      throw new Meteor.Error(111, 'Not a valid wishlist');
    }

    // Update job by jobId
    return Wishlists.update({_id: wishlistId}, {$set: {title: title, description: description, image: image, private: private,expireDate: expireDate}});
  }
});
