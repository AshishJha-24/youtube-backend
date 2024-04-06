const getPublicIdfromLink=(link)=>{
    const  avatarLinkSplitted = link.split('/');
    const lastIndexofAvatarLink=avatarLinkSplitted[avatarLinkSplitted.length-1];
    const  splitlastIndexofAvatarLink=lastIndexofAvatarLink.split('.');
    const publicId=splitlastIndexofAvatarLink[0];

    return publicId;

}


export default getPublicIdfromLink;