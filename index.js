/**
 * @param {string | URL | Request} url
 */
async function getScanResponse(url) {
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.data.user.edge_follow;
  } catch (error) {
    console.error(error);
  }
}

async function getResults() {
  /**
   * @type {import("types").UserResult[]} results
   */
  const results = [];
  const userId = getCookie("ds_user_id");
  let url = getScanUrl(userId);

  let hasNext = true;
  for (let i = 0; hasNext; i++) {
    /**
     * @type {import("types").User} results
     */
    const response = await getScanResponse(url);

    response.edges.forEach((x) => {
      if (!x.node.follows_viewer)
        results.push({
          username: x.node.username,
          id: x.node.id,
          profile_pic_url: x.node.profile_pic_url,
        });
    });

    hasNext = response.page_info.has_next_page;
    url = getScanUrl(userId, response.page_info.end_cursor);
    await sleep(Math.floor(Math.random() * 800) + 1000);
    if (i % 6 === 0 && i !== 0) {
      await sleep(15000);
    }
  }
  return results;
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  // @ts-ignore
  return new Promise((/** @type {TimerHandler} */ resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * @param {string} name
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) {
    return null;
  }
  return parts.pop().split(";").shift();
}

/**
 * @param {string} userId
 * @param {string} [nextCode]
 */
function getScanUrl(userId, nextCode) {
  if (!nextCode) {
    return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${userId}","include_reel":"false","fetch_mutual":"false","first":"24"}`;
  }
  return `https://www.instagram.com/graphql/query/?query_hash=3dec7e2c57367ef3da3d987d89f9dbc8&variables={"id":"${userId}","include_reel":"false","fetch_mutual":"false","first":"24","after":"${nextCode}"}`;
}

/**
 * @param {string} idToUnfollow
 */
function getUnfollowUrl(idToUnfollow) {
  return `https://www.instagram.com/web/friendships/${idToUnfollow}/unfollow/`;
}

/**
 * @param { import("types").UserResult[] } unfollowers
 * @param { number } limit
 */
function displaySomeUnfollowers(unfollowers, limit) {
  let unfollowersList = "";
  for (let i = 0; i < limit && unfollowers.length > 0; i++) {
    unfollowersList += unfollowerElement(unfollowers.pop());
  }

  const ul = document.createElement("ul");
  ul.innerHTML = unfollowersList;
  document.forms.item(0).append(ul);
}

/**
 * @param { import("types").UserResult[] } unfollowers
 */
function displayUnfollowers(unfollowers) {
  let unfollowersList = unfollowers.reduce(
    (acc, curr) => acc + unfollowerElement(curr),
    "",
  );

  const ul = document.createElement("ul");
  ul.innerHTML = unfollowersList;
  document.forms.item(0).append(ul);
}

/**
 * @param {import("types").UserResult} user
 */
function unfollowerElement(user) {
  return `
    <li style="display:flex; justify-content: space-between; align-items: center; height: 100px;">
        <img loading="lazy" height="100" width="100" src="${user.profile_pic_url}" />
        <label for="${user.username}">${user.username}</label> 
        <input class="check-unfollow" name="${user.username}" value="${user.id}" type="checkbox"></input>
    </li>
`;
}

function createFormAndButtons() {
  const unfollowButton = document.createElement("button");
  unfollowButton.type = "button";
  unfollowButton.innerText = "Unfollow";
  unfollowButton.addEventListener("click", handleUnfollow);

  const checkAll = document.createElement("button");
  checkAll.type = "button";
  checkAll.innerText = "Check all";
  checkAll.addEventListener("click", handleCheckAll);

  const form = document.createElement("form");
  form.id = "unfollowSelectedList";

  document.body.append(unfollowButton, checkAll, form);
}

/**
 * @typedef {Object} SelectedUser
 * @prop {string} username
 * @prop {string} id
 */

/**
 * @param {string} id
 * @param {string} username
 * @param {string} token
 */
async function unfollowUser(id, username, token) {
  try {
    await fetch(getUnfollowUrl(id), {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-csrftoken": token,
      },
      method: "POST",
      mode: "cors",
      credentials: "include",
    });
    console.log(username + " unfollowed successfully");
  } catch (error) {
    return { username, error };
  }
}

/**
 * @param {SelectedUser[]} selectedUsersList
 * @param {string} csrftoken
 */
async function unfollowList(selectedUsersList, csrftoken) {
  let notUnfollowed = [];
  for (let i = 0; selectedUsersList.length > 0; i++) {
    const { id, username } = selectedUsersList.pop();
    const error = await unfollowUser(id, username, csrftoken);
    if (error) {
      alert(`${error.username} could not be unfollowed. Error: ${error.error}`);
      notUnfollowed.push(error.username);
    }
    await sleep(Math.floor(Math.random() * 2500) + 4000);
    if (i % 5 === 0 && i !== 0) {
      await sleep(30000);
    }
  }

  return notUnfollowed;
}

async function main() {
  document.head.innerHTML = `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Instagram Unfollowers</title>
`;
  document.body.innerHTML = "";
  createFormAndButtons();

  let unfollowers = await getResults();
  displaySomeUnfollowers(unfollowers, 25);
  createLoadMoreButton(unfollowers);

  return null;
}

/**
 * @param {import("types").UserResult[]} unfollowers
 */
function createLoadMoreButton(unfollowers) {
  const loadMore = document.createElement("button");
  loadMore.type = "button";
  loadMore.innerText = "Load more";
  loadMore.addEventListener("click", () => {
    if (unfollowers.length > 0) {
      displaySomeUnfollowers(unfollowers, 25);
    }
  });
  document.body.appendChild(loadMore);
}

function getToken() {
  const csrftoken = getCookie("csrftoken");
  if (!csrftoken) {
    throw new Error("Could not get user auth token");
  }
  return csrftoken;
}

async function handleUnfollow() {
  const formData = new FormData(document.forms.item(0));
  const token = getToken();
  let iterations = 0;
  // @ts-ignore
  for (const [key, value] of formData) {
    const error = await unfollowUser(value, key, token);
    if (error) {
      alert(`${error.username} could not be unfollowed. Error: ${error.error}`);
    }
    await sleep(Math.floor(Math.random() * 2500) + 4000);
    if (iterations % 6 === 0 && iterations !== 0) {
      await sleep(30000);
    }
    iterations++;
  }
  document.forms.item(0).innerHTML = "";
  return null;
}

function handleCheckAll() {
  const allCheckboxes = document.querySelectorAll("input");
  for (let i = 0; i < allCheckboxes.length; i++) {
    allCheckboxes[i].checked = true;
  }
}

main();
