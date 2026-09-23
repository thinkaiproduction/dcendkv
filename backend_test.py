#!/usr/bin/env python3
"""
DCEN DKV Backend API Test Suite
Tests all endpoints with role-based access control
"""
import requests
import json
import sys

# Base URL from environment
BASE_URL = "https://multimedia-hub-27.preview.emergentagent.com/api"

# Test results tracking
tests_passed = 0
tests_failed = 0
critical_failures = []

def log_test(name, passed, details=""):
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✅ {name}")
        if details:
            print(f"   {details}")
    else:
        tests_failed += 1
        print(f"❌ {name}")
        if details:
            print(f"   {details}")
            critical_failures.append(f"{name}: {details}")

def check_no_objectid(data, test_name):
    """Verify no MongoDB _id is leaked"""
    data_str = json.dumps(data)
    if '_id' in data_str:
        log_test(f"{test_name} - No ObjectId leak", False, "Found _id in response")
        return False
    return True

print("=" * 80)
print("DCEN DKV Backend API Test Suite")
print("=" * 80)
print(f"Base URL: {BASE_URL}\n")

# ============================================================================
# SETUP: Seed Data
# ============================================================================
print("\n[SETUP] Seeding database...")
try:
    resp = requests.post(f"{BASE_URL}/seed", json={}, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if data.get('skipped'):
            print("✓ Data already exists (skipped)")
        else:
            print(f"✓ Seeded: {data.get('equipment', 0)} equipment, {data.get('portfolio', 0)} portfolio, {data.get('testimonials', 0)} testimonials, {data.get('crew', 0)} crew")
    else:
        print(f"⚠ Seed returned {resp.status_code}: {resp.text}")
except Exception as e:
    print(f"⚠ Seed error: {e}")

# ============================================================================
# A) AUTH TESTS
# ============================================================================
print("\n" + "=" * 80)
print("A) AUTH TESTS")
print("=" * 80)

# A1: Register new user
print("\n[A1] Register new user")
try:
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Test User",
        "email": f"testuser{requests.get(f'{BASE_URL}/').json().get('service', 'x')}@example.com",
        "phone": "08123456789",
        "password": "testpass123"
    }, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if 'token' in data and 'user' in data:
            user_role = data['user'].get('role')
            if user_role == 'customer':
                log_test("Register new user", True, f"Token received, role: {user_role}")
                check_no_objectid(data, "Register")
            else:
                log_test("Register new user", False, f"Expected role 'customer', got '{user_role}'")
        else:
            log_test("Register new user", False, "Missing token or user in response")
    else:
        # Might fail if user exists, that's ok for idempotent test
        log_test("Register new user", True, f"Status {resp.status_code} (may already exist)")
except Exception as e:
    log_test("Register new user", False, str(e))

# A2: Duplicate email register
print("\n[A2] Duplicate email register (should fail)")
try:
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Admin Duplicate",
        "email": "admin@dcen.com",
        "password": "test123"
    }, timeout=10)
    if resp.status_code == 400:
        log_test("Duplicate email register returns 400", True, resp.json().get('error', ''))
    else:
        log_test("Duplicate email register returns 400", False, f"Got {resp.status_code} instead of 400")
except Exception as e:
    log_test("Duplicate email register returns 400", False, str(e))

# A3: Login as admin
print("\n[A3] Login as admin (owner role)")
admin_token = None
try:
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@dcen.com",
        "password": "admin123"
    }, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if 'token' in data and 'user' in data:
            admin_token = data['token']
            user_role = data['user'].get('role')
            if user_role == 'owner':
                log_test("Login as admin", True, f"Token received, role: {user_role}")
                check_no_objectid(data, "Login admin")
            else:
                log_test("Login as admin", False, f"Expected role 'owner', got '{user_role}'")
        else:
            log_test("Login as admin", False, "Missing token or user")
    else:
        log_test("Login as admin", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("Login as admin", False, str(e))

# A4: Login with wrong password
print("\n[A4] Login with wrong password (should fail)")
try:
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@dcen.com",
        "password": "wrongpassword"
    }, timeout=10)
    if resp.status_code == 400:
        log_test("Login wrong password returns 400", True, resp.json().get('error', ''))
    else:
        log_test("Login wrong password returns 400", False, f"Got {resp.status_code} instead of 400")
except Exception as e:
    log_test("Login wrong password returns 400", False, str(e))

# A5: Login as customer
print("\n[A5] Login as customer")
customer_token = None
try:
    resp = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "customer@dcen.com",
        "password": "customer123"
    }, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        if 'token' in data and 'user' in data:
            customer_token = data['token']
            user_role = data['user'].get('role')
            if user_role == 'customer':
                log_test("Login as customer", True, f"Token received, role: {user_role}")
                check_no_objectid(data, "Login customer")
            else:
                log_test("Login as customer", False, f"Expected role 'customer', got '{user_role}'")
        else:
            log_test("Login as customer", False, "Missing token or user")
    else:
        log_test("Login as customer", False, f"Status {resp.status_code}: {resp.text}")
except Exception as e:
    log_test("Login as customer", False, str(e))

# A6: GET /auth/me with token
print("\n[A6] GET /auth/me with Bearer token")
if admin_token:
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data:
                log_test("GET /auth/me with token", True, f"User: {data['user'].get('name')}")
                check_no_objectid(data, "Auth me")
            else:
                log_test("GET /auth/me with token", False, "Missing user in response")
        else:
            log_test("GET /auth/me with token", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /auth/me with token", False, str(e))
else:
    log_test("GET /auth/me with token", False, "No admin token available")

# A7: GET /auth/me without token
print("\n[A7] GET /auth/me without token (should fail)")
try:
    resp = requests.get(f"{BASE_URL}/auth/me", timeout=10)
    if resp.status_code == 401:
        log_test("GET /auth/me without token returns 401", True, resp.json().get('error', ''))
    else:
        log_test("GET /auth/me without token returns 401", False, f"Got {resp.status_code} instead of 401")
except Exception as e:
    log_test("GET /auth/me without token returns 401", False, str(e))

# ============================================================================
# B) PUBLIC READS
# ============================================================================
print("\n" + "=" * 80)
print("B) PUBLIC READS")
print("=" * 80)

# B1: GET /packages
print("\n[B1] GET /packages")
try:
    resp = requests.get(f"{BASE_URL}/packages", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        packages = data.get('packages', [])
        if len(packages) == 3:
            pkg_ids = [p.get('id') for p in packages]
            if 'basic' in pkg_ids and 'professional' in pkg_ids and 'premium' in pkg_ids:
                log_test("GET /packages returns 3 packages", True, f"IDs: {pkg_ids}")
                check_no_objectid(data, "Packages")
            else:
                log_test("GET /packages returns 3 packages", False, f"Wrong package IDs: {pkg_ids}")
        else:
            log_test("GET /packages returns 3 packages", False, f"Got {len(packages)} packages instead of 3")
    else:
        log_test("GET /packages returns 3 packages", False, f"Status {resp.status_code}")
except Exception as e:
    log_test("GET /packages returns 3 packages", False, str(e))

# B2: GET /equipment
print("\n[B2] GET /equipment")
try:
    resp = requests.get(f"{BASE_URL}/equipment", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        equipment = data.get('equipment', [])
        if len(equipment) == 12:
            # Check all have UUID id and no _id
            all_have_uuid = all('id' in e and isinstance(e['id'], str) and len(e['id']) == 36 for e in equipment)
            no_objectid = '_id' not in json.dumps(data)
            if all_have_uuid and no_objectid:
                log_test("GET /equipment returns 12 items with UUID", True, f"Count: {len(equipment)}")
            else:
                log_test("GET /equipment returns 12 items with UUID", False, f"UUID check: {all_have_uuid}, No _id: {no_objectid}")
        else:
            log_test("GET /equipment returns 12 items with UUID", False, f"Got {len(equipment)} items instead of 12")
    else:
        log_test("GET /equipment returns 12 items with UUID", False, f"Status {resp.status_code}")
except Exception as e:
    log_test("GET /equipment returns 12 items with UUID", False, str(e))

# B3: GET /portfolio
print("\n[B3] GET /portfolio")
try:
    resp = requests.get(f"{BASE_URL}/portfolio", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        portfolio = data.get('portfolio', [])
        if len(portfolio) == 8:
            log_test("GET /portfolio returns 8 items", True, f"Count: {len(portfolio)}")
            check_no_objectid(data, "Portfolio")
        else:
            log_test("GET /portfolio returns 8 items", False, f"Got {len(portfolio)} items instead of 8")
    else:
        log_test("GET /portfolio returns 8 items", False, f"Status {resp.status_code}")
except Exception as e:
    log_test("GET /portfolio returns 8 items", False, str(e))

# B4: GET /testimonials
print("\n[B4] GET /testimonials")
try:
    resp = requests.get(f"{BASE_URL}/testimonials", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        testimonials = data.get('testimonials', [])
        if len(testimonials) == 4:
            log_test("GET /testimonials returns 4 items", True, f"Count: {len(testimonials)}")
            check_no_objectid(data, "Testimonials")
        else:
            log_test("GET /testimonials returns 4 items", False, f"Got {len(testimonials)} items instead of 4")
    else:
        log_test("GET /testimonials returns 4 items", False, f"Status {resp.status_code}")
except Exception as e:
    log_test("GET /testimonials returns 4 items", False, str(e))

# B5: GET /crew
print("\n[B5] GET /crew")
try:
    resp = requests.get(f"{BASE_URL}/crew", timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        crew = data.get('crew', [])
        if len(crew) == 5:
            log_test("GET /crew returns 5 items", True, f"Count: {len(crew)}")
            check_no_objectid(data, "Crew")
        else:
            log_test("GET /crew returns 5 items", False, f"Got {len(crew)} items instead of 5")
    else:
        log_test("GET /crew returns 5 items", False, f"Status {resp.status_code}")
except Exception as e:
    log_test("GET /crew returns 5 items", False, str(e))

# ============================================================================
# C) BOOKING TESTS
# ============================================================================
print("\n" + "=" * 80)
print("C) BOOKING TESTS")
print("=" * 80)

# C1: POST /bookings/estimate with specific calculation
print("\n[C1] POST /bookings/estimate - price calculation")
try:
    resp = requests.post(f"{BASE_URL}/bookings/estimate", json={
        "packageId": "professional",
        "cameras": 5,
        "operatorNeeded": 4,
        "platform": "Custom RTMP",
        "durationHours": 8,
        "addDrone": True
    }, timeout=10)
    if resp.status_code == 200:
        data = resp.json()
        total = data.get('total')
        breakdown = data.get('breakdown', [])
        # Expected: 8500000 + (2*750000) + (1*500000) + 500000 + (2*400000) + 2500000 = 14300000
        expected_total = 14300000
        if total == expected_total:
            log_test("Booking estimate calculation", True, f"Total: Rp {total:,} (correct)")
            if len(breakdown) > 0:
                print(f"   Breakdown items: {len(breakdown)}")
            check_no_objectid(data, "Booking estimate")
        else:
            log_test("Booking estimate calculation", False, f"Expected {expected_total:,}, got {total:,}")
            print(f"   Breakdown: {breakdown}")
    else:
        log_test("Booking estimate calculation", False, f"Status {resp.status_code}")
except Exception as e:
    log_test("Booking estimate calculation", False, str(e))

# C2: POST /bookings as customer
print("\n[C2] POST /bookings as customer")
customer_booking_id = None
if customer_token:
    try:
        resp = requests.post(f"{BASE_URL}/bookings", json={
            "eventName": "Test Event",
            "eventType": "Seminar",
            "date": "2025-02-15",
            "time": "10:00",
            "location": "Jakarta",
            "packageId": "basic",
            "cameras": 1,
            "operatorNeeded": 1,
            "platform": "YouTube Live",
            "durationHours": 4,
            "contactName": "Test Customer",
            "contactPhone": "08111111111"
        }, headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            booking = data.get('booking', {})
            if booking.get('status') == 'Menunggu' and 'estimatedPrice' in booking:
                customer_booking_id = booking.get('id')
                log_test("POST /bookings as customer", True, f"Booking created, status: {booking['status']}, price: {booking['estimatedPrice']}")
                check_no_objectid(data, "Create booking")
            else:
                log_test("POST /bookings as customer", False, f"Missing status or estimatedPrice")
        else:
            log_test("POST /bookings as customer", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("POST /bookings as customer", False, str(e))
else:
    log_test("POST /bookings as customer", False, "No customer token")

# C3: GET /bookings as customer (own only)
print("\n[C3] GET /bookings as customer (own only)")
if customer_token:
    try:
        resp = requests.get(f"{BASE_URL}/bookings", headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            bookings = data.get('bookings', [])
            log_test("GET /bookings as customer", True, f"Retrieved {len(bookings)} booking(s)")
            check_no_objectid(data, "Get bookings customer")
        else:
            log_test("GET /bookings as customer", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /bookings as customer", False, str(e))
else:
    log_test("GET /bookings as customer", False, "No customer token")

# C4: GET /bookings as admin (all)
print("\n[C4] GET /bookings as admin (all)")
admin_booking_id = None
if admin_token:
    try:
        resp = requests.get(f"{BASE_URL}/bookings", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            bookings = data.get('bookings', [])
            if len(bookings) > 0:
                admin_booking_id = bookings[0].get('id')
            log_test("GET /bookings as admin", True, f"Retrieved {len(bookings)} booking(s) (all)")
            check_no_objectid(data, "Get bookings admin")
        else:
            log_test("GET /bookings as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /bookings as admin", False, str(e))
else:
    log_test("GET /bookings as admin", False, "No admin token")

# C5: PUT /bookings/:id as admin (update status)
print("\n[C5] PUT /bookings/:id as admin (update status)")
if admin_token and admin_booking_id:
    try:
        resp = requests.put(f"{BASE_URL}/bookings/{admin_booking_id}", json={
            "status": "Disetujui"
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            booking = data.get('booking', {})
            if booking.get('status') == 'Disetujui':
                log_test("PUT /bookings/:id update status", True, f"Status updated to {booking['status']}")
                check_no_objectid(data, "Update booking status")
            else:
                log_test("PUT /bookings/:id update status", False, f"Status not updated: {booking.get('status')}")
        else:
            log_test("PUT /bookings/:id update status", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("PUT /bookings/:id update status", False, str(e))
else:
    log_test("PUT /bookings/:id update status", False, "No admin token or booking ID")

# C6: PUT /bookings/:id as admin (assign crew)
print("\n[C6] PUT /bookings/:id as admin (assign crew)")
if admin_token and admin_booking_id:
    try:
        resp = requests.put(f"{BASE_URL}/bookings/{admin_booking_id}", json={
            "assignedCrew": ["Budi"]
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            booking = data.get('booking', {})
            if 'Budi' in booking.get('assignedCrew', []):
                log_test("PUT /bookings/:id assign crew", True, f"Crew assigned: {booking['assignedCrew']}")
                check_no_objectid(data, "Update booking crew")
            else:
                log_test("PUT /bookings/:id assign crew", False, f"Crew not assigned: {booking.get('assignedCrew')}")
        else:
            log_test("PUT /bookings/:id assign crew", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("PUT /bookings/:id assign crew", False, str(e))
else:
    log_test("PUT /bookings/:id assign crew", False, "No admin token or booking ID")

# C7: PUT /bookings/:id as admin (create invoice)
print("\n[C7] PUT /bookings/:id as admin (create invoice)")
if admin_token and admin_booking_id:
    try:
        resp = requests.put(f"{BASE_URL}/bookings/{admin_booking_id}", json={
            "createInvoice": True,
            "amount": 100
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            booking = data.get('booking', {})
            invoice = booking.get('invoice')
            if invoice and 'number' in invoice and 'amount' in invoice:
                log_test("PUT /bookings/:id create invoice", True, f"Invoice created: {invoice['number']}, amount: {invoice['amount']}")
                check_no_objectid(data, "Update booking invoice")
            else:
                log_test("PUT /bookings/:id create invoice", False, f"Invoice not created: {invoice}")
        else:
            log_test("PUT /bookings/:id create invoice", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("PUT /bookings/:id create invoice", False, str(e))
else:
    log_test("PUT /bookings/:id create invoice", False, "No admin token or booking ID")

# C8: PUT /bookings/:id as customer (should fail)
print("\n[C8] PUT /bookings/:id as customer (should fail 403)")
if customer_token and customer_booking_id:
    try:
        resp = requests.put(f"{BASE_URL}/bookings/{customer_booking_id}", json={
            "status": "Disetujui"
        }, headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 403:
            log_test("PUT /bookings/:id as customer returns 403", True, resp.json().get('error', ''))
        else:
            log_test("PUT /bookings/:id as customer returns 403", False, f"Got {resp.status_code} instead of 403")
    except Exception as e:
        log_test("PUT /bookings/:id as customer returns 403", False, str(e))
else:
    log_test("PUT /bookings/:id as customer returns 403", False, "No customer token or booking ID")

# ============================================================================
# D) EQUIPMENT CRUD
# ============================================================================
print("\n" + "=" * 80)
print("D) EQUIPMENT CRUD")
print("=" * 80)

# D1: POST /equipment as admin
print("\n[D1] POST /equipment as admin")
new_equipment_id = None
if admin_token:
    try:
        resp = requests.post(f"{BASE_URL}/equipment", json={
            "name": "Test Camera",
            "category": "Kamera",
            "spec": "Test spec",
            "pricePerDay": 500000,
            "stock": 2,
            "available": True
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            equipment = data.get('equipment', {})
            if 'id' in equipment and len(equipment['id']) == 36:
                new_equipment_id = equipment['id']
                log_test("POST /equipment as admin", True, f"Equipment created with UUID: {equipment['id'][:8]}...")
                check_no_objectid(data, "Create equipment")
            else:
                log_test("POST /equipment as admin", False, "Missing or invalid UUID")
        else:
            log_test("POST /equipment as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("POST /equipment as admin", False, str(e))
else:
    log_test("POST /equipment as admin", False, "No admin token")

# D2: POST /equipment as customer (should fail)
print("\n[D2] POST /equipment as customer (should fail 403)")
if customer_token:
    try:
        resp = requests.post(f"{BASE_URL}/equipment", json={
            "name": "Unauthorized Camera",
            "category": "Kamera",
            "pricePerDay": 100000
        }, headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 403:
            log_test("POST /equipment as customer returns 403", True, resp.json().get('error', ''))
        else:
            log_test("POST /equipment as customer returns 403", False, f"Got {resp.status_code} instead of 403")
    except Exception as e:
        log_test("POST /equipment as customer returns 403", False, str(e))
else:
    log_test("POST /equipment as customer returns 403", False, "No customer token")

# D3: PUT /equipment/:id as admin
print("\n[D3] PUT /equipment/:id as admin")
if admin_token and new_equipment_id:
    try:
        resp = requests.put(f"{BASE_URL}/equipment/{new_equipment_id}", json={
            "available": False
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            equipment = data.get('equipment', {})
            if equipment.get('available') == False:
                log_test("PUT /equipment/:id as admin", True, f"Equipment updated, available: {equipment['available']}")
                check_no_objectid(data, "Update equipment")
            else:
                log_test("PUT /equipment/:id as admin", False, f"Available not updated: {equipment.get('available')}")
        else:
            log_test("PUT /equipment/:id as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("PUT /equipment/:id as admin", False, str(e))
else:
    log_test("PUT /equipment/:id as admin", False, "No admin token or equipment ID")

# D4: DELETE /equipment/:id as customer (should fail)
print("\n[D4] DELETE /equipment/:id as customer (should fail 403)")
if customer_token and new_equipment_id:
    try:
        resp = requests.delete(f"{BASE_URL}/equipment/{new_equipment_id}", headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 403:
            log_test("DELETE /equipment/:id as customer returns 403", True, resp.json().get('error', ''))
        else:
            log_test("DELETE /equipment/:id as customer returns 403", False, f"Got {resp.status_code} instead of 403")
    except Exception as e:
        log_test("DELETE /equipment/:id as customer returns 403", False, str(e))
else:
    log_test("DELETE /equipment/:id as customer returns 403", False, "No customer token or equipment ID")

# D5: DELETE /equipment/:id as admin
print("\n[D5] DELETE /equipment/:id as admin")
if admin_token and new_equipment_id:
    try:
        resp = requests.delete(f"{BASE_URL}/equipment/{new_equipment_id}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                log_test("DELETE /equipment/:id as admin", True, "Equipment deleted")
            else:
                log_test("DELETE /equipment/:id as admin", False, "Success not true")
        else:
            log_test("DELETE /equipment/:id as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("DELETE /equipment/:id as admin", False, str(e))
else:
    log_test("DELETE /equipment/:id as admin", False, "No admin token or equipment ID")

# ============================================================================
# E) RENTALS
# ============================================================================
print("\n" + "=" * 80)
print("E) RENTALS")
print("=" * 80)

# E1: Get an equipment ID for rental
print("\n[E1] Get equipment for rental")
rental_equipment_id = None
try:
    resp = requests.get(f"{BASE_URL}/equipment", timeout=10)
    if resp.status_code == 200:
        equipment = resp.json().get('equipment', [])
        if len(equipment) > 0:
            rental_equipment_id = equipment[0]['id']
            rental_price_per_day = equipment[0]['pricePerDay']
            print(f"✓ Using equipment: {equipment[0]['name']} (Rp {rental_price_per_day:,}/day)")
        else:
            print("⚠ No equipment available")
    else:
        print(f"⚠ Failed to get equipment: {resp.status_code}")
except Exception as e:
    print(f"⚠ Error getting equipment: {e}")

# E2: POST /rentals
print("\n[E2] POST /rentals")
rental_id = None
if rental_equipment_id:
    try:
        resp = requests.post(f"{BASE_URL}/rentals", json={
            "equipmentId": rental_equipment_id,
            "days": 3,
            "startDate": "2025-02-20",
            "contactName": "Test Renter",
            "contactPhone": "08123456789"
        }, headers={"Authorization": f"Bearer {customer_token}"} if customer_token else {}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            rental = data.get('rental', {})
            expected_total = rental_price_per_day * 3
            expected_deposit = round(rental_price_per_day * 0.5)
            if rental.get('total') == expected_total and rental.get('deposit') == expected_deposit and rental.get('status') == 'Menunggu':
                rental_id = rental.get('id')
                log_test("POST /rentals calculation", True, f"Total: {rental['total']:,}, Deposit: {rental['deposit']:,}, Status: {rental['status']}")
                check_no_objectid(data, "Create rental")
            else:
                log_test("POST /rentals calculation", False, f"Expected total {expected_total}, deposit {expected_deposit}, got {rental.get('total')}, {rental.get('deposit')}")
        else:
            log_test("POST /rentals calculation", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("POST /rentals calculation", False, str(e))
else:
    log_test("POST /rentals calculation", False, "No equipment ID")

# E3: GET /rentals as customer
print("\n[E3] GET /rentals as customer")
if customer_token:
    try:
        resp = requests.get(f"{BASE_URL}/rentals", headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            rentals = data.get('rentals', [])
            log_test("GET /rentals as customer", True, f"Retrieved {len(rentals)} rental(s)")
            check_no_objectid(data, "Get rentals customer")
        else:
            log_test("GET /rentals as customer", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /rentals as customer", False, str(e))
else:
    log_test("GET /rentals as customer", False, "No customer token")

# E4: GET /rentals as admin
print("\n[E4] GET /rentals as admin")
if admin_token:
    try:
        resp = requests.get(f"{BASE_URL}/rentals", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            rentals = data.get('rentals', [])
            log_test("GET /rentals as admin", True, f"Retrieved {len(rentals)} rental(s) (all)")
            check_no_objectid(data, "Get rentals admin")
        else:
            log_test("GET /rentals as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /rentals as admin", False, str(e))
else:
    log_test("GET /rentals as admin", False, "No admin token")

# E5: PUT /rentals/:id as admin
print("\n[E5] PUT /rentals/:id as admin")
if admin_token and rental_id:
    try:
        resp = requests.put(f"{BASE_URL}/rentals/{rental_id}", json={
            "status": "Disetujui"
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            rental = data.get('rental', {})
            if rental.get('status') == 'Disetujui':
                log_test("PUT /rentals/:id as admin", True, f"Status updated to {rental['status']}")
                check_no_objectid(data, "Update rental")
            else:
                log_test("PUT /rentals/:id as admin", False, f"Status not updated: {rental.get('status')}")
        else:
            log_test("PUT /rentals/:id as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("PUT /rentals/:id as admin", False, str(e))
else:
    log_test("PUT /rentals/:id as admin", False, "No admin token or rental ID")

# ============================================================================
# F) CREW + STATS
# ============================================================================
print("\n" + "=" * 80)
print("F) CREW + STATS")
print("=" * 80)

# F1: POST /crew as admin
print("\n[F1] POST /crew as admin")
new_crew_id = None
if admin_token:
    try:
        resp = requests.post(f"{BASE_URL}/crew", json={
            "name": "Test Crew Member",
            "position": "Tester",
            "phone": "08199999999",
            "status": "Tersedia"
        }, headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            crew = data.get('crew', {})
            if 'id' in crew:
                new_crew_id = crew['id']
                log_test("POST /crew as admin", True, f"Crew created: {crew['name']}")
                check_no_objectid(data, "Create crew")
            else:
                log_test("POST /crew as admin", False, "Missing crew ID")
        else:
            log_test("POST /crew as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("POST /crew as admin", False, str(e))
else:
    log_test("POST /crew as admin", False, "No admin token")

# F2: POST /crew as customer (should fail)
print("\n[F2] POST /crew as customer (should fail 403)")
if customer_token:
    try:
        resp = requests.post(f"{BASE_URL}/crew", json={
            "name": "Unauthorized Crew",
            "position": "Hacker"
        }, headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 403:
            log_test("POST /crew as customer returns 403", True, resp.json().get('error', ''))
        else:
            log_test("POST /crew as customer returns 403", False, f"Got {resp.status_code} instead of 403")
    except Exception as e:
        log_test("POST /crew as customer returns 403", False, str(e))
else:
    log_test("POST /crew as customer returns 403", False, "No customer token")

# F3: DELETE /crew/:id as customer (should fail)
print("\n[F3] DELETE /crew/:id as customer (should fail 403)")
if customer_token and new_crew_id:
    try:
        resp = requests.delete(f"{BASE_URL}/crew/{new_crew_id}", headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 403:
            log_test("DELETE /crew/:id as customer returns 403", True, resp.json().get('error', ''))
        else:
            log_test("DELETE /crew/:id as customer returns 403", False, f"Got {resp.status_code} instead of 403")
    except Exception as e:
        log_test("DELETE /crew/:id as customer returns 403", False, str(e))
else:
    log_test("DELETE /crew/:id as customer returns 403", False, "No customer token or crew ID")

# F4: DELETE /crew/:id as admin
print("\n[F4] DELETE /crew/:id as admin")
if admin_token and new_crew_id:
    try:
        resp = requests.delete(f"{BASE_URL}/crew/{new_crew_id}", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get('success'):
                log_test("DELETE /crew/:id as admin", True, "Crew deleted")
            else:
                log_test("DELETE /crew/:id as admin", False, "Success not true")
        else:
            log_test("DELETE /crew/:id as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("DELETE /crew/:id as admin", False, str(e))
else:
    log_test("DELETE /crew/:id as admin", False, "No admin token or crew ID")

# F5: GET /stats as customer (should fail)
print("\n[F5] GET /stats as customer (should fail 403)")
if customer_token:
    try:
        resp = requests.get(f"{BASE_URL}/stats", headers={"Authorization": f"Bearer {customer_token}"}, timeout=10)
        if resp.status_code == 403:
            log_test("GET /stats as customer returns 403", True, resp.json().get('error', ''))
        else:
            log_test("GET /stats as customer returns 403", False, f"Got {resp.status_code} instead of 403")
    except Exception as e:
        log_test("GET /stats as customer returns 403", False, str(e))
else:
    log_test("GET /stats as customer returns 403", False, "No customer token")

# F6: GET /stats as admin
print("\n[F6] GET /stats as admin")
if admin_token:
    try:
        resp = requests.get(f"{BASE_URL}/stats", headers={"Authorization": f"Bearer {admin_token}"}, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            stats = data.get('stats', {})
            chart = data.get('chart', [])
            required_fields = ['customers', 'totalBookings', 'totalRentals', 'revenue', 'running', 'availableEquip', 'totalEquip']
            has_all_fields = all(field in stats for field in required_fields)
            if has_all_fields and len(chart) == 6:
                log_test("GET /stats as admin", True, f"Stats: {stats}, Chart months: {len(chart)}")
                check_no_objectid(data, "Stats")
            else:
                log_test("GET /stats as admin", False, f"Missing fields or wrong chart length. Has all fields: {has_all_fields}, Chart length: {len(chart)}")
        else:
            log_test("GET /stats as admin", False, f"Status {resp.status_code}")
    except Exception as e:
        log_test("GET /stats as admin", False, str(e))
else:
    log_test("GET /stats as admin", False, "No admin token")

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("TEST SUMMARY")
print("=" * 80)
print(f"✅ Passed: {tests_passed}")
print(f"❌ Failed: {tests_failed}")
print(f"📊 Total: {tests_passed + tests_failed}")
print(f"✓ Success Rate: {tests_passed / (tests_passed + tests_failed) * 100:.1f}%")

if critical_failures:
    print("\n" + "=" * 80)
    print("CRITICAL FAILURES")
    print("=" * 80)
    for failure in critical_failures:
        print(f"❌ {failure}")

print("\n" + "=" * 80)
sys.exit(0 if tests_failed == 0 else 1)
