// export const AddViewedTagOnPost = (document: Document, postId: string) => {
//   const postCardElement = document.querySelector(`[data-id="${postId}"]`) as HTMLElement;

//   if (postCardElement == null) {
//     return;
//   }

//   const cardFooterContent = postCardElement.querySelector('footer > div > div');

//   const viewedLabel = document.createElement("label")
//   viewedLabel.innerHTML = "viewed";
//   viewedLabel.style.color = "#b4ffb4"

//   cardFooterContent.append(viewedLabel);
// }

// export const Configurations = {
//   hostsAllowed: ["kemono.cr", "coomer.cr"]
// }