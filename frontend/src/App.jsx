import { useEffect, useMemo, useState } from "react";
import { api, jsonBody } from "./api.js";

const savedSession = () => {
  try { return JSON.parse(localStorage.getItem("smart-winnr-session")) || null; }
  catch { return null; }
};

function Rating({ value }) {
  return <span className="rating"><span aria-label={`${value || 0} out of 5 stars`}>{"★".repeat(Math.round(value || 0))}{"☆".repeat(5 - Math.round(value || 0))}</span><b>{value ? Number(value).toFixed(1) : "New"}</b></span>;
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api(`/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST", body: jsonBody(form)
      });
      onAuthenticated({ token: result.token, user: result.user });
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <a className="brand" href="#"><span className="brand-mark">s</span> smart<span>winnr</span></a>
      <p className="eyebrow">GOOD FOOD, GOOD COMPANY</p>
      <h1>{mode === "login" ? "Welcome back." : "Join the table."}</h1>
      <p className="muted">{mode === "login" ? "Sign in to find your next favorite." : "Create a customer account and start exploring."}</p>
      <form className="stack" onSubmit={submit}>
        {mode === "register" && <label>Your name<input autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>}
        <label>Email address<input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {mode === "register" && <small className="muted">8–16 characters, with upper and lower case, a number, and a symbol.</small>}
        {error && <p className="error">{error}</p>}
        <button className="button primary wide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>
      <p className="switch-auth">{mode === "login" ? "New to Smart Winnr?" : "Already have an account?"} <button className="text-button" onClick={() => { setError(""); setMode(mode === "login" ? "register" : "login"); }}> {mode === "login" ? "Create an account" : "Sign in"}</button></p>
    </section>
    <aside className="auth-art"><div className="art-copy"><span className="eyebrow">A LITTLE TASTE OF EVERYWHERE</span><h2>Find the places<br />worth sharing.</h2><p>Real ratings from real diners. Your next great meal is just around the corner.</p></div><div className="art-stamp">made for<br /><strong>food lovers</strong><span>✳</span></div></aside>
  </main>;
}

function RestaurantCard({ restaurant, onOpen }) {
  return <button className="restaurant-card" onClick={onOpen}>
    <div className="card-visual"><span>{restaurant.cuisine?.slice(0, 1).toUpperCase() || "R"}</span><small>{restaurant.cuisine}</small></div>
    <div className="card-content"><div className="card-heading"><h3>{restaurant.name}</h3><Rating value={restaurant.averageRating} /></div><p className="muted">{restaurant.location}</p><div className="card-bottom"><span>{restaurant.reviewCount} {restaurant.reviewCount === 1 ? "review" : "reviews"}</span>{restaurant.customerRating && <span className="your-rating">Your rating: {restaurant.customerRating}★</span>}</div>
    </div>
  </button>;
}

function CustomerHome({ session }) {
  const [restaurants, setRestaurants] = useState([]);
  const [filters, setFilters] = useState({ search: "", location: "", cuisine: "" });
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError("");
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value.trim()));
      const result = await api(`/restaurants?${query}`, { token: session.token });
      setRestaurants(result.restaurants);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  return <main className="page-wrap">
    <section className="hero"><div><p className="eyebrow">YOUR CITY, SERVED</p><h1>Good taste<br /><em>starts here.</em></h1><p>Discover local favorites, see what diners think, and find a table worth talking about.</p></div><div className="hero-doodle" aria-hidden="true">✳</div></section>
    <section className="section">
      <div className="section-title"><div><p className="eyebrow">THE NEIGHBORHOOD GUIDE</p><h2>Find your next favorite</h2></div><span className="result-count">{restaurants.length} places</span></div>
      <form className="filters" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label className="search-field"><span>⌕</span><input aria-label="Search by restaurant name" placeholder="Restaurant name" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
        <input aria-label="Filter by location" placeholder="Location" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} />
        <input aria-label="Filter by cuisine" placeholder="Cuisine" value={filters.cuisine} onChange={(e) => setFilters({ ...filters, cuisine: e.target.value })} />
        <button className="button primary" disabled={busy}>{busy ? "Searching…" : "Search"}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {busy ? <p className="muted">Finding great places…</p> : restaurants.length ? <div className="restaurant-grid">{restaurants.map((restaurant) => <RestaurantCard key={restaurant._id} restaurant={restaurant} onOpen={() => setSelected(restaurant)} />)}</div> : <div className="empty"><span>⌕</span><h3>No restaurants found</h3><p>Try a different name, location, or cuisine.</p></div>}
    </section>
    {selected && <RestaurantDialog restaurant={selected} session={session} onClose={() => { setSelected(null); load(); }} />}
  </main>;
}

function RestaurantDialog({ restaurant, session, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [mine, setMine] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ averageRating: restaurant.averageRating, reviewCount: restaurant.reviewCount });

  async function load() {
    try {
      const [result, own] = await Promise.all([
        api(`/restaurants/${restaurant._id}/reviews`),
        api("/reviews/mine", { token: session.token })
      ]);
      setReviews(result.reviews); setStats(result);
      const existing = own.reviews.find((review) => review.restaurant?._id === restaurant._id);
      setMine(existing || null);
      if (existing) { setRating(existing.rating); setComment(existing.comment); }
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [restaurant._id]);

  async function saveReview(event) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await api(mine ? `/reviews/${mine._id}` : `/reviews/restaurant/${restaurant._id}`, {
        method: mine ? "PUT" : "POST", token: session.token, body: jsonBody({ rating: Number(rating), comment })
      });
      setMine(result.review); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function removeReview() {
    if (!mine || !window.confirm("Delete your review?")) return;
    try { await api(`/reviews/${mine._id}`, { method: "DELETE", token: session.token }); setMine(null); setRating(5); setComment(""); await load(); }
    catch (e) { setError(e.message); }
  }

  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="dialog" role="dialog" aria-modal="true" aria-label={`${restaurant.name} details`}>
      <button className="close-button" onClick={onClose} aria-label="Close">×</button>
      <div className="dialog-banner"><span>{restaurant.cuisine}</span></div>
      <p className="eyebrow">{restaurant.location}</p><h2>{restaurant.name}</h2><p className="muted">{restaurant.description || "A local spot waiting to be discovered."}</p>
      <div className="dialog-rating"><Rating value={stats.averageRating} /><span>{stats.reviewCount} reviews</span></div>
      <div className="distribution">{[5, 4, 3, 2, 1].map((stars) => {
        const count = stats.ratingDistribution?.find((row) => row.rating === stars)?.count || 0;
        const percent = stats.reviewCount ? Math.round((count / stats.reviewCount) * 100) : 0;
        return <div className="distribution-row" key={stars}><span>{stars}★</span><span className="distribution-track"><span style={{ width: `${percent}%` }} /></span><small>{count}</small></div>;
      })}</div>
      <h3>Reviews</h3>
      <div className="review-list">{reviews.length ? reviews.map((review) => <article className="review" key={review._id}><div><strong>{review.customer?.name || "Diner"}</strong><span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div><p>{review.comment}</p></article>) : <p className="muted">No reviews yet. Be the first to share your experience.</p>}</div>
      <form className="review-form" onSubmit={saveReview}>
        <h3>{mine ? "Update your review" : "Share your experience"}</h3>
        <label>Rating<select value={rating} onChange={(e) => setRating(e.target.value)}>{[5, 4, 3, 2, 1].map((number) => <option key={number} value={number}>{number} {number === 1 ? "star" : "stars"}</option>)}</select></label>
        <label>Your review<textarea minLength="5" maxLength="500" required value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What should other diners know?" /></label>
        {error && <p className="error">{error}</p>}
        <div className="actions"><button className="button primary" disabled={busy}>{busy ? "Saving…" : mine ? "Update review" : "Post review"}</button>{mine && <button type="button" className="button danger-ghost" onClick={removeReview}>Delete</button>}</div>
      </form>
    </section>
  </div>;
}

function OwnerHome({ session }) {
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingStats, setRatingStats] = useState({ averageRating: null, reviewCount: 0, ratingDistribution: [] });
  const [form, setForm] = useState({ name: "", location: "", cuisine: "", description: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([api("/owner/restaurant", { token: session.token }), api("/owner/reviews", { token: session.token })])
      .then(([place, results]) => { setRestaurant(place.restaurant); setForm({ name: place.restaurant.name, location: place.restaurant.location, cuisine: place.restaurant.cuisine, description: place.restaurant.description || "" }); setReviews(results.reviews); setRatingStats(results); })
      .catch((e) => setError(e.message));
  }, []);

  async function update(event) {
    event.preventDefault(); setError(""); setNotice("");
    try { const result = await api("/owner/restaurant", { method: "PATCH", token: session.token, body: jsonBody(form) }); setRestaurant(result.restaurant); setNotice("Restaurant details updated."); }
    catch (e) { setError(e.message); }
  }

  if (!restaurant) return <main className="page-wrap"><p className={error ? "error" : "muted"}>{error || "Loading your restaurant…"}</p></main>;
  return <main className="page-wrap admin-page">
    <div className="page-heading"><div><p className="eyebrow">RESTAURANT OWNER</p><h1>Your place, your story.</h1><p className="muted">Manage the details diners see and keep up with their feedback.</p></div><div className="stat-card"><span>Average rating</span><strong><Rating value={ratingStats.averageRating} /></strong><small>{ratingStats.reviewCount} reviews</small><small>{ratingStats.ratingDistribution.map((row) => `${row.rating}★ ${row.count}`).join(" · ") || "No ratings yet"}</small></div></div>
    {error && <p className="error">{error}</p>}{notice && <p className="success">{notice}</p>}
    <div className="owner-layout"><form className="panel stack" onSubmit={update}><h2>Restaurant details</h2><label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Location<input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label><label>Cuisine<input required value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} /></label><label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength="2000" /></label><button className="button primary">Save changes</button></form>
      <section className="panel"><h2>Diner feedback</h2>{reviews.length ? <div className="table-list">{reviews.map((review) => <article className="review" key={review._id}><div><strong>{review.customer?.name || "Diner"}</strong><span className="review-stars">{"★".repeat(review.rating)}</span></div><p>{review.comment}</p><small className="muted">{new Date(review.createdAt).toLocaleDateString()}</small></article>)}</div> : <p className="muted">No reviews yet.</p>}</section></div>
  </main>;
}

function AdminHome({ session }) {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setError("");
    try {
      const [stats, userList, restaurantList, reviewList] = await Promise.all([
        api("/admin/dashboard", { token: session.token }),
        api("/admin/users", { token: session.token }),
        api("/admin/restaurants", { token: session.token }),
        api("/admin/reviews", { token: session.token })
      ]);
      setDashboard(stats); setUsers(userList.users); setRestaurants(restaurantList.restaurants); setReviews(reviewList.reviews);
    } catch (e) { setError(e.message); throw e; }
  }
  useEffect(() => { load().catch(() => {}); }, []);
  const filteredUsers = useMemo(() => users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase())), [users, userSearch]);
  const filteredRestaurants = useMemo(() => restaurants.filter((place) => `${place.name} ${place.location} ${place.cuisine}`.toLowerCase().includes(restaurantSearch.toLowerCase())), [restaurants, restaurantSearch]);

  async function runAction(action, successMessage) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(successMessage); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function addOwner(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = Object.fromEntries(new FormData(formElement).entries());
    await runAction(() => api("/admin/users", { method: "POST", token: session.token, body: jsonBody({ ...data, role: "owner" }) }), "Owner account created.");
    formElement.reset();
  }

  async function addRestaurant(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const data = Object.fromEntries(new FormData(formElement).entries());
    if (!data.owner) delete data.owner;
    await runAction(() => api("/admin/restaurants", { method: "POST", token: session.token, body: jsonBody(data) }), "Restaurant created.");
    formElement.reset();
  }

  async function updateRestaurant(place) {
    const name = window.prompt("Restaurant name", place.name);
    if (name === null) return;
    const location = window.prompt("Location", place.location);
    if (location === null) return;
    const cuisine = window.prompt("Cuisine", place.cuisine);
    if (cuisine === null) return;
    await runAction(() => api(`/admin/restaurants/${place._id}`, { method: "PATCH", token: session.token, body: jsonBody({ name, location, cuisine }) }), "Restaurant updated.");
  }

  return <main className="page-wrap admin-page">
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>Good morning, {session.user.name.split(" ")[0]}.</h1><p className="muted">A clear view of the community around the table.</p></div></div>
    {error && <p className="error">{error}</p>}{message && <p className="success">{message}</p>}
    <div className="stats-grid">{dashboard && [["Members", dashboard.totalUsers], ["Restaurants", dashboard.totalRestaurants], ["Reviews", dashboard.totalReviews], ["Platform rating", dashboard.averagePlatformRating ? `${dashboard.averagePlatformRating} / 5` : "Not rated"]].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong>{label === "Platform rating" && dashboard.ratingDistribution?.map((row) => <small key={row.rating}>{row.rating}★ {row.count} · </small>)}</div>)}</div>
    <div className="admin-columns">
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">PEOPLE</p><h2>Users</h2></div><input aria-label="Search users" placeholder="Search users" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} /></div>
        <form className="inline-form" onSubmit={addOwner}><input name="name" placeholder="Owner name" required /><input name="email" placeholder="Email" type="email" required /><input name="password" placeholder="Temp password" type="password" required minLength="8" /><button className="button primary" disabled={busy}>Add owner</button></form>
        <div className="table-list">{filteredUsers.map((user) => <div className="list-row" key={user._id}><div><strong>{user.name}</strong><small>{user.email}</small></div><select aria-label={`Role for ${user.name}`} value={user.role} onChange={(e) => runAction(() => api(`/admin/users/${user._id}`, { method: "PATCH", token: session.token, body: jsonBody({ role: e.target.value }) }), "User role updated.")}><option value="customer">Customer</option><option value="owner">Owner</option><option value="admin">Admin</option></select><button className="icon-button" disabled={busy || user._id === session.user.id} title="Delete user" onClick={() => window.confirm(`Delete ${user.name}?`) && runAction(() => api(`/admin/users/${user._id}`, { method: "DELETE", token: session.token }), "User deleted.")}>×</button></div>)}</div>
      </section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">PLACES</p><h2>Restaurants</h2></div><input aria-label="Search restaurants" placeholder="Search restaurants" value={restaurantSearch} onChange={(e) => setRestaurantSearch(e.target.value)} /></div>
        <form className="inline-form restaurant-form" onSubmit={addRestaurant}><input name="name" placeholder="Name" required /><input name="location" placeholder="Location" required /><input name="cuisine" placeholder="Cuisine" required /><select name="owner" defaultValue=""><option value="">Unassigned owner</option>{users.filter((user) => user.role === "owner").map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}</select><button className="button primary" disabled={busy}>Add place</button></form>
        <div className="table-list">{filteredRestaurants.map((place) => <div className="list-row" key={place._id}><div><strong>{place.name}</strong><small>{place.location} · {place.cuisine} · {place.reviewCount} reviews</small></div><select aria-label={`Owner for ${place.name}`} value={place.owner || ""} onChange={(e) => runAction(() => api(`/admin/restaurants/${place._id}/owner`, { method: "PATCH", token: session.token, body: jsonBody({ ownerId: e.target.value || null }) }), "Restaurant owner updated.")}><option value="">Unassigned</option>{users.filter((user) => user.role === "owner").map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}</select><button className="text-button" onClick={() => updateRestaurant(place)}>Edit</button><button className="icon-button" title="Delete restaurant" onClick={() => window.confirm(`Delete ${place.name} and its reviews?`) && runAction(() => api(`/admin/restaurants/${place._id}`, { method: "DELETE", token: session.token }), "Restaurant deleted.")}>×</button></div>)}</div>
      </section>
    </div>
    <section className="panel admin-reviews"><div className="panel-head"><div><p className="eyebrow">COMMUNITY VOICE</p><h2>Recent reviews</h2></div></div><div className="table-list">{reviews.map((review) => <div className="list-row review-row" key={review._id}><div><strong>{review.restaurant?.name || "Restaurant"} · {review.customer?.name || "Diner"} <span className="review-stars">{"★".repeat(review.rating)}</span></strong><small>{review.comment}</small></div><button className="button danger-ghost" onClick={() => window.confirm("Remove this review?") && runAction(() => api(`/reviews/${review._id}`, { method: "DELETE", token: session.token }), "Review removed.")}>Remove</button></div>)}</div></section>
  </main>;
}

export default function App() {
  const [session, setSession] = useState(savedSession);
  function signIn(next) { localStorage.setItem("smart-winnr-session", JSON.stringify(next)); setSession(next); }
  function signOut() { localStorage.removeItem("smart-winnr-session"); setSession(null); }
  if (!session) return <AuthScreen onAuthenticated={signIn} />;
  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark">s</span> smart<span>winnr</span></a><div className="account"><span className="avatar">{session.user.name.slice(0, 1).toUpperCase()}</span><div><strong>{session.user.name}</strong><small>{session.user.role === "owner" ? "Restaurant owner" : session.user.role}</small></div><button className="button ghost" onClick={signOut}>Sign out</button></div></header>
    {session.user.role === "admin" ? <AdminHome session={session} /> : session.user.role === "owner" ? <OwnerHome session={session} /> : <CustomerHome session={session} />}
    <footer className="footer"><span>smartwinnr</span><span>Discover. Dine. Share.</span></footer>
  </div>;
}
