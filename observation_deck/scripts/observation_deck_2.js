/**
 * chrisw@soe.ucsc.edu
 * SEPT 2014
 * observation_deck_2.js
 */

(function($) {
    // extend the jQuery prototype
    $.fn.extend({
        test : function() {
            return $(this).bind('click', function() {
                alert('Custom plugin click!');
            });
        },
        observation_deck : function(config) {
            // begin observation_deck
            var eventAlbum = config['eventAlbum'];
            // end observation_deck
        }
    });
})(jQuery);
