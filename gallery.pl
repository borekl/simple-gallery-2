#!/usr/bin/perl

use v5.10;
use utf8;
use FindBin qw($Bin);
use lib "$Bin/lib";
use Text::Pluralize;

use Gallery;
use GallerySet;

if(-r 'info.json') {
  Gallery->new()->write_index('index.json');
} else {
  say "Gallery set mode";
  my $gs = GallerySet->new();

  say
    pluralize('%d galler{ies|y|ies} found, ', $gs->count()),
    pluralize('%d need{|s|} updating', scalar($gs->update_needed()));

  print 'Writing gallery set index ... ';
  $gs->write_index();
  say 'done';

  $gs->update_galleries(sub {
    my $g = shift;
    say $g->dir(), ' updated';
  });
}
