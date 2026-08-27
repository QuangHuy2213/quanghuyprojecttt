import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class CommunityService {
 constructor(private prisma: PrismaService) {}
 private score(v:any){const n=Number(v);if(!Number.isInteger(n)||n<1||n>5)throw new BadRequestException('Điểm phải từ 1 đến 5.');return n;}
 getPostReviews(postId:number){return this.prisma.postReview.findMany({where:{postId},include:{user:{select:{id:true,fullName:true,avatarUrl:true}}},orderBy:{updatedAt:'desc'}});}
 savePostReview(userId:string,postId:number,b:any){const content=String(b.content||'').trim();if(!content)throw new BadRequestException('Vui lòng nhập nhận xét.');return this.prisma.postReview.upsert({where:{userId_postId:{userId,postId}},create:{userId,postId,rating:this.score(b.rating),content},update:{rating:this.score(b.rating),content},include:{post:{select:{id:true,title:true,thumbnail:true}}}});}
 myReviews(userId:string){return this.prisma.postReview.findMany({where:{userId},include:{post:{select:{id:true,title:true,thumbnail:true}}},orderBy:{updatedAt:'desc'}});}
 deleteReview(userId:string,id:number){return this.prisma.postReview.deleteMany({where:{id,userId}});}
 areaReviews(districtCode?:string){return this.prisma.areaReview.findMany({where:districtCode?{districtCode}:{},include:{user:{select:{fullName:true,avatarUrl:true}}},orderBy:{updatedAt:'desc'}});}
 saveAreaReview(userId:string,b:any){if(!b.cityCode||!b.districtCode)throw new BadRequestException('Vui lòng chọn khu vực.');const data={cityCode:String(b.cityCode),districtCode:String(b.districtCode),security:this.score(b.security),traffic:this.score(b.traffic),amenities:this.score(b.amenities),environment:this.score(b.environment),affordability:this.score(b.affordability),content:String(b.content||'').trim()};if(!data.content)throw new BadRequestException('Vui lòng nhập trải nghiệm.');return this.prisma.areaReview.upsert({where:{userId_districtCode:{userId,districtCode:data.districtCode}},create:{userId,...data},update:data});}
 async toggleFollow(followerId:string,followingId:string){if(followerId===followingId)throw new BadRequestException('Không thể tự theo dõi chính mình.');const where={followerId_followingId:{followerId,followingId}};const found=await this.prisma.follow.findUnique({where});if(found){await this.prisma.follow.delete({where});return{following:false};}await this.prisma.follow.create({data:{followerId,followingId}});return{following:true};}
 async followInfo(viewerId:string|undefined,userId:string){const [followers,following,relation]=await Promise.all([this.prisma.follow.count({where:{followingId:userId}}),this.prisma.follow.count({where:{followerId:userId}}),viewerId?this.prisma.follow.findUnique({where:{followerId_followingId:{followerId:viewerId,followingId:userId}}}):null]);return{followers,following,isFollowing:!!relation};}
}
