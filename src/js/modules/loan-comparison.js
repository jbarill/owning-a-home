var debounce = require('debounce');
var cost = require('overall-loan-cost');
var objectify = require('cf-objectify');
var formatUSD = require('format-usd');
var unFormatUSD = require('unformat-usd');
var isMoney = require('is-money-usd');
var amortize = require('amortize');
var humanizeLoanType = require('./humanize-loan-type');
require('./object.observe-polyfill');

var loan = objectify([
  {
    name: 'location',
    source: 'location'
  },{
    name: 'minfico',
    source: 'credit-score',
    type: 'number'
  },{
    name: 'maxfico',
    source: 'credit-score + 20',
    type: 'number'
  },{
    name: 'amount-borrowed',
    source: 'house-price - down-payment',
    type: 'number'
  },{
    name: 'price',
    source: 'house-price',
    type: 'number'
  },{
    name: 'down-payment',
    source: 'down-payment',
    type: 'number'
  },{
    name: 'rate-structure',
    source: 'rate-structure'
  },{
    name: 'loan-term',
    source: 'loan-term',
    type: 'number'
  },{
    name: 'loan-type',
    source: 'loan-type'
  },{
    name: 'arm-type',
    source: 'arm-type'
  },{
    name: 'interest-rate',
    source: 'interest-rate',
    type: 'number'
  },{
    name: 'monthly-payment',
    source: function() {
      return amortize({
        amount: loan['amount-borrowed'],
        rate: loan['interest-rate'],
        totalTerm: loan['loan-term'] * 12,
        amortizeTerm: 60
      }).payment;
    }
  },{
    name: 'overall-cost',
    source: function() {
      return cost({
        amountBorrowed: loan['amount-borrowed'],
        rate: loan['interest-rate'],
        totalTerm: loan['loan-term'] * 12,
        downPayment: loan['down-payment'],
        closingCosts: 3000 // hard coded value for now
      }).overallCost;
    }
  }
]);

objectify.update();

window.loan = loan;

// Cache these for later
var $amount = $('.loan-amount-display'),
    $closing = $('.closing-costs-display'),
    $monthly = $('.monthly-payment-display'),
    $overall = $('.overall-costs-display'),
    $interest = $('.interest-rate-display'),
    $percent = $('#percent-down-input'),
    $summaryYear = $('#lc-summary-year'),
    $summaryStruct = $('#lc-summary-structure'),
    $summaryType = $('#lc-summary-type');

// Keep track of the last down payment field that was accessed.
var percentDownAccessedLast;

function _stayPositive( num ) {
  return parseFloat( num ) < 0 ? 0 : num;
}

function updateComparisons( changes ) {

  for ( var i = 0, len = changes.length; i < len; i++ ) {
    if ( changes[i].name == 'down-payment' && !percentDownAccessedLast ) {
      var val = loan['down-payment'] / loan['price'] * 100;
      $('#percent-down-input').val( Math.round(val) );
      percentDownAccessedLast = false;
    }
  }

  $amount.text( formatUSD( _stayPositive(loan['amount-borrowed']),{decimalPlaces:0}) );
  $closing.text( formatUSD( 3000 + parseInt(loan['down-payment'], 10)) );
  $monthly.text( formatUSD(loan['monthly-payment']) );
  $overall.text( formatUSD(loan['overall-cost']) );
  $interest.text( loan['interest-rate'] );
  $summaryYear.text( loan['loan-term'] );
  $summaryStruct.text( loan['rate-structure'] );
  $summaryType.text( humanizeLoanType(loan['loan-type']) );

}

// Observe the loan object for changes
Object.observe( loan, updateComparisons );

function _updateDownPayment( ev ) {

  var val;

  if ( /percent/.test(ev.target.id) ) {
    val = $('#percent-down-input').val() / 100 * loan.price;
    // objectify.update();
    $('#down-payment-input').val( Math.round(val) ).trigger('keyup');
    percentDownAccessedLast = true;
    return;
  }

  if ( /down\-payment/.test(ev.target.id) ) {
    percentDownAccessedLast = false;
  }

  if ( /house\-price/.test(ev.target.id) && percentDownAccessedLast !== undefined ) {
    if ( percentDownAccessedLast ) {
      val = $('#percent-down-input').val() / 100 * loan.price || 0;
      objectify.update();
      $('#down-payment-input').val( Math.round(val) ).trigger('keyup');
    } else {
      val = loan['down-payment'] / loan['price'] * 100 || 0;
      $('#percent-down-input').val( Math.round(val) );
    }
  }

  window.percentDownAccessedLast = percentDownAccessedLast;

}

// The pricing fields (price, dp, dp %) are wonky and require special handling.
$('.pricing').on( 'keyup', 'input', _updateDownPayment );

// toggle the inputs on mobile
$('.lc-toggle').click(function(e) {
  e.preventDefault();
  var $link = $(this).attr('href'),
      $inputs = $($link),
      $editLink = $('.lc-edit-link');
  $inputs.toggleClass('input-open');
  $editLink.toggle();
});
