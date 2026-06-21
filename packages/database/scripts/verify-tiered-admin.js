import assert from "node:assert";

function parseCookie(cookieStr, name) {
  if (!cookieStr) return undefined;
  const matches = cookieStr.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

async function run() {
  console.log("Starting Tiered Admin & Invitation Flow integration tests...");

  // Helper: Login
  async function login(email, password) {
    const res = await fetch("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Login failed for ${email}: ${res.status} - ${errText}`);
    }

    const cookie = res.headers.get("set-cookie");
    return cookie;
  }

  // Helper: Post request
  async function post(url, body, cookie) {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["cookie"] = cookie;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`POST ${url} failed: ${res.status} - ${text}`);
    }
    return res.json();
  }

  // Helper: Patch request
  async function patch(url, body, cookie) {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers["cookie"] = cookie;

    const res = await fetch(url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PATCH ${url} failed: ${res.status} - ${text}`);
    }
    return res.json();
  }

  // Helper: Get request
  async function get(url, cookie) {
    const headers = {};
    if (cookie) headers["cookie"] = cookie;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET ${url} failed: ${res.status} - ${text}`);
    }
    return res.json();
  }

  try {
    // 1. Login as Super Admin
    console.log("1. Logging in as Super Admin...");
    const adminCookie = await login("admin@skillgraph.com", "123456");
    console.log("Logged in as Super Admin.");

    // 2. Fetch academic options to get university ID
    console.log("2. Fetching academic options...");
    const options = await get("http://localhost:3000/api/v1/auth/academic-options", adminCookie);
    const du = options.data.universities.find(u => u.shortName === "DU");
    assert.ok(du, "Dhaka University (DU) should exist in seeded data");
    console.log(`Found DU university ID: ${du.id}`);

    // 3. Generate invitation for a professor
    console.log("3. Creating academic invitation...");
    const inviteEmail = `invited.prof.${Date.now()}@du.ac.bd`;
    const inviteResult = await post("http://localhost:3000/api/v1/admin/invitations", {
      email: inviteEmail,
      role: "professor",
      universityId: du.id
    }, adminCookie);

    assert.ok(inviteResult.data.token, "Invitation response should contain a secure token");
    assert.strictEqual(inviteResult.data.email, inviteEmail);
    console.log(`Created invitation with token: ${inviteResult.data.token}`);

    // 4. Retrieve invitation details via public endpoint
    console.log("4. Fetching invitation details via public API...");
    const inviteDetails = await get(`http://localhost:3000/api/v1/auth/invite/${inviteResult.data.token}`);
    assert.strictEqual(inviteDetails.data.email, inviteEmail);
    assert.strictEqual(inviteDetails.data.role, "professor");
    assert.strictEqual(inviteDetails.data.universityId, du.id);
    console.log("Invitation details fetched successfully and match target attributes.");

    // 5. Register using the invitation token
    console.log("5. Registering user with invitation token...");
    const registrationResult = await post("http://localhost:3000/api/v1/auth/register", {
      fullName: "Invited Professor",
      password: "password123",
      inviteToken: inviteResult.data.token
    });
    assert.ok(registrationResult.data.verificationToken, "Registration payload should include email verification token");
    console.log(`User registered. Verification token: ${registrationResult.data.verificationToken}`);

    // 6. Complete email verification (auto-approves due to active invitation)
    console.log("6. Verifying email using verification token...");
    const verifyResult = await post("http://localhost:3000/api/v1/auth/verify-email", {
      token: registrationResult.data.verificationToken
    });
    assert.strictEqual(verifyResult.data.verified, true, "Email should be verified");
    console.log("Email verification complete.");

    // 7. Verify the invited user has immediate access
    console.log("7. Logging in as invited professor and verifying immediate active access...");
    const invitedProfCookie = await login(inviteEmail, "password123");
    const meResult = await get("http://localhost:3000/api/v1/auth/me", invitedProfCookie);
    assert.strictEqual(meResult.data.isVerified, true, "Invited user should be auto-approved (isVerified: true)");
    assert.strictEqual(meResult.data.academicProfile?.universityId, du.id, "Invited user should be linked to correct university");
    console.log("✓ Invitation registration & auto-approval verification passed!");

    // 8. Register an uninvited professor (self-registered)
    console.log("\n8. Testing self-registration flow (requires admin approval)...");
    const selfProfEmail = `self.prof.${Date.now()}@du.ac.bd`;
    const selfRegResult = await post("http://localhost:3000/api/v1/auth/register", {
      fullName: "Self Professor",
      email: selfProfEmail,
      role: "professor",
      password: "password123"
    });
    console.log("Self-registered professor account created.");

    // Verify email
    console.log("Verifying self-registered professor email...");
    await post("http://localhost:3000/api/v1/auth/verify-email", {
      token: selfRegResult.data.verificationToken
    });

    // Login as uninvited professor
    const selfProfCookie = await login(selfProfEmail, "password123");
    const selfMeResult = await get("http://localhost:3000/api/v1/auth/me", selfProfCookie);
    assert.strictEqual(selfMeResult.data.isVerified, false, "Self-registered professor should default to unverified");

    // Attempt to access student directory (should return 403 / restricted)
    console.log("Verifying that unverified professor is blocked from accessing university directories...");
    try {
      await get("http://localhost:3000/api/v1/professor/students", selfProfCookie);
      assert.fail("Should have thrown a 403 error for unverified account access");
    } catch (err) {
      assert.ok(err.message.includes("403"), "Access to restricted directories should return 403");
      console.log("✓ Unverified user blocked successfully (returned 403).");
    }

    // 9. Moderate and approve the self-registered professor
    console.log("\n9. Fetching unverified users via admin list filter...");
    const pendingUsers = await get("http://localhost:3000/api/v1/admin/users?isVerified=false", adminCookie);
    const selfProfRecord = pendingUsers.data.users.find(u => u.email === selfProfEmail);
    assert.ok(selfProfRecord, "Self-registered professor should appear in the pending list");
    console.log(`Found pending user record: ${selfProfRecord.id}`);

    console.log("Approving user registration...");
    const approvalResult = await patch(`http://localhost:3000/api/v1/admin/users/${selfProfRecord.id}`, {
      isVerified: true
    }, adminCookie);
    assert.strictEqual(approvalResult.data.isVerified, true, "User should be verified after admin approval");

    // 10. Login as professor again and check if directories are now accessible
    console.log("10. Logging in and checking student directory access post-approval...");
    const updatedProfCookie = await login(selfProfEmail, "password123");
    const newMe = await get("http://localhost:3000/api/v1/auth/me", updatedProfCookie);
    assert.strictEqual(newMe.data.isVerified, true, "Professor should now be verified");

    const students = await get("http://localhost:3000/api/v1/professor/students", updatedProfCookie);
    assert.ok(Array.isArray(students.data), "Should successfully fetch student directory list");
    console.log(`✓ Student directory accessible! Professor sees ${students.data.length} students.`);

    console.log("\n=============================================");
    console.log("ALL ADMIN & INVITATION INTEGRATION TESTS PASSED!");
    console.log("=============================================");
  } catch (error) {
    console.error("\n❌ Verification Failed:", error);
    process.exit(1);
  }
}

run();