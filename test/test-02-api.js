/*global describe:true, it:true, before:true, after:true */

var
	chai = require('chai'),
	assert = chai.assert,
	expect = chai.expect,
	should = chai.should()
	;

var
	parser = require('../lib/parser'),
	recurly = require('../lib/recurly'),
	util = require('util'),
	uuid = require('node-uuid')
	;

// This recurly account is an empty test account connected to their
// development gateway.
var config =
{
	"apikey": "3dacdb54665b44b8a8c5e10238b7a11c",
	"plan_code": "recurring-test",
	"subdomain": "recurring-testing"
};

var rparser, plan, account, subscription;
var old_account_id = 'test-account-1';
var fresh_account_id;

before(function()
{
	rparser = parser.createParser();
	recurly.setAPIKey(config.apikey);
});

describe('Plan', function()
{
	var cached;

	// create a plan

	it('can fetch all plans from the test Recurly account', function(done)
	{
		recurly.Plan.all(function(plans)
		{
			plans.should.be.an('object');
			var plan_codes = Object.keys(plans);
			expect(plan_codes.length).to.be.above(0);
			plan_codes[0].should.not.equal('undefined');
			cached = plan_codes;
			done();
		});
	});

	it('can fetch a single plan', function(done)
	{
		plan = new recurly.Plan();
		plan.id = cached[0];
		plan.fetch(function(err)
		{
			should.not.exist(err);
			plan.href.length.should.be.above(0);
			plan.should.have.property('name');
			plan.should.have.property('description');
			plan.name.should.be.ok;
			plan.description.should.be.ok;
			done();
		});
	});

	// modify
});

describe('Account', function()
{
	var cached;

	it('can create an account', function(done)
	{
		fresh_account_id = uuid.v4();
		var data =
		{
			id: fresh_account_id,
			email: 'test@example.com',
			first_name: 'John',
			last_name: 'Whorfin',
			company_name: 'Yoyodyne Propulsion Systems',
		};

		recurly.Account.create(data, function(err, newAccount)
		{
			should.not.exist(err);
			newAccount.should.be.an('object');
			newAccount.id.should.equal(fresh_account_id);
			newAccount.company_name.should.equal('Yoyodyne Propulsion Systems');
			done();
		});
	});
	it('can create or reopen a previously-closed account, transparently', function(done)
	{
		var data =
		{
			id: old_account_id,
			email: 'test@example.com',
			first_name: 'John',
			last_name: 'Smallberries',
			company_name: 'Yoyodyne Propulsion Systems',
		};

		recurly.Account.create(data, function(err, newAccount)
		{
			should.not.exist(err);
			newAccount.should.be.an('object');
			newAccount.first_name.should.equal('John'); // from old data
			newAccount.last_name.should.equal('Smallberries'); // from old data
			done();
		});
	});


	it('can fetch a single account', function(done)
	{
		account = new recurly.Account();
		account.id = fresh_account_id;
		account.fetch(function(err)
		{
			should.not.exist(err);
			account.should.be.an('object');
			account.email.should.equal('test@example.com');
			account.company_name.should.equal('Yoyodyne Propulsion Systems');
			done();
		});
	});

	it('can fetch all accounts from the test Recurly account', function(done)
	{
		recurly.Account.all(function(accounts)
		{
			accounts.should.be.an('object');
			var uuids = Object.keys(accounts);
			expect(uuids.length).to.be.above(0);
			uuids[0].should.not.equal('undefined');
			cached = uuids;
			done();
		});
	});

	it('can update an account', function(done)
	{
		account.company_name = 'Yoyodyne Propulsion, International';
		account.update(function(err, updated)
		{
			should.not.exist(err);
			updated.should.be.an('object');

			var testAcc = new recurly.Account();
			testAcc.id = account.id;
			testAcc.fetch(function(err)
			{
				should.not.exist(err);
				testAcc.company_name.should.equal(account.company_name);
				done();
			});
		});
	});

});

describe('BillingInfo', function()
{
	var binfo;

	it('can add billing info to an account', function(done)
	{
		binfo = new recurly.BillingInfo();
		binfo.account_code = fresh_account_id;
		var billing_data = {
			first_name: account.first_name,
			last_name: account.last_name,
			number: '4111-1111-1111-1111',
			month: 1,
			year: 2015,
			verification_value: '111'
		};

		binfo.update(billing_data, function(err, updated)
		{
			should.not.exist(err);
			updated.last_four.should.equal('1111');
			done();
		});
	});

	it('throws an error when missing a required billing data field', function(done)
	{
		var binfo2 = new recurly.BillingInfo();
		binfo2.account_code = fresh_account_id;

		var wrong = function()
		{
			var inadequate = {
				first_name: account.first_name,
				last_name: account.last_name,
			};
			binfo2.update(inadequate, function() {} );
		};
		expect(wrong).to.throw(Error);
		done();
	});

	it('can fetch the billing info for an account', function(done)
	{
		account.fetchBillingInfo(function(err, info)
		{
			should.not.exist(err);
			info.first_name.should.equal(account.first_name);
			info.last_four.should.equal('1111');
			done();
		});
	});
});

describe('Subscription', function()
{
	var cached, subscription;

	it('can create a subscription for an account', function(done)
	{
		var data = {
			plan_code: config.plan_code,
			account: {
				account_code: account.id
			},
			currency: 'USD',
			quantity: 10,
		};

		recurly.Subscription.create(data, function(err, newsub)
		{
			should.not.exist(err);
			newsub.id.should.be.ok;
			newsub.quantity.should.equal(10);
			newsub.plan.should.be.an('object');
			newsub.plan.plan_code.should.equal(config.plan_code);

			subscription = newsub;
			done();
		});
	});

	it('can fetch all subscriptions associated with an account', function(done)
	{
		account.fetchSubscriptions(function(err, subscriptions)
		{
			should.not.exist(err);
			subscriptions.should.be.an('array');
			cached = subscriptions;
			done();
		});
	});

	it('can fetch a single subscription', function(done)
	{
		var uuid = cached[0].uuid;
		subscription = new recurly.Subscription();
		subscription.id = uuid;
		subscription.fetch(function(err)
		{
			should.not.exist(err);
			subscription.should.have.property('account');
			subscription.account.should.be.an('object');
			subscription.account.should.have.property('href');
			subscription.account_id.should.equal(account.id);

			// TODO
			done();
		});
	});

	it('throws an error when attempting to modify a subscription without a timeframe', function(done)
	{
		var wrong = function()
		{
			subscription.update({ inadequate: true }, function() {} );
		};
		expect(wrong).to.throw(Error);
		done();
	});

	it('can modify a subscription', function(done)
	{
		var mods = {
			timeframe: 'now',
			quantity: subscription.quantity + 3,
		};

		subscription.update(mods, function(err, updated)
		{
			should.not.exist(err);
			updated.should.be.an('object');
			updated.quantity.should.equal(mods.quantity);
			done();
		});
	});

	it('can postpone a subscription (unimplemented)', function(done)
	{
		done();
	});

	it('can cancel a subscription (unimplemented)', function(done)
	{
		done();
	});

	it('can terminate a subscription without a refund', function(done)
	{
		subscription.terminate('none', function(err, sub)
		{
			should.not.exist(err);
			sub.state.should.equal('expired');
			sub.canceled_at.should.be.a('date');
			done();
		});
	});
});


describe('deleting things', function()
{
	it('can close an account', function(done)
	{
		account = new recurly.Account();
		account.id = fresh_account_id;

		account.close(function(err, closed)
		{
			should.not.exist(err);
			closed.should.equal(true);

			// TOOD refetch and verify status as stored with recurly

			// and nuke the other one too while we're at it
			account = new recurly.Account();
			account.id = old_account_id;
			account.close(function(err, closed)
			{
				should.not.exist(err);
				done();
			});
		});
	});

	// delete plan, restoring test account to beautiful emptiness

});

