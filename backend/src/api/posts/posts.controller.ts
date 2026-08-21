import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto, PostsQueryDto, ToggleFavoriteDto, UpdatePostDto } from './dto/posts.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài đăng đang hoạt động' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 8 })
  @ApiQuery({ name: 'city', required: false, example: '79' })
  @ApiQuery({ name: 'district', required: false, example: '760' })
  @ApiQuery({ name: 'keyword', required: false, example: 'căn hộ' })
  @ApiQuery({ name: 'price', required: false, example: '1b-3b' })
  @ApiQuery({ name: 'area', required: false, example: '50-80' })
  async getAllPosts(@Query() query: PostsQueryDto) {
    return this.postsService.findAllPosts(
      query.page ?? 1,
      query.limit ?? 8,
      query.city,
      query.district,
      query.keyword,
      query.price,
      query.area,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết bài đăng' })
  @ApiParam({ name: 'id', example: 123 })
  async getPostById(@Param('id') id: string) {
    return this.postsService.findOnePost(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Tạo bài đăng mới' })
  @ApiBody({ type: CreatePostDto })
  async createNewPost(@Body() body: CreatePostDto) {
    return this.postsService.createPost(body);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Lưu hoặc bỏ lưu bài đăng' })
  @ApiParam({ name: 'id', example: 123 })
  @ApiBody({ type: ToggleFavoriteDto })
  async toggleFavorite(
    @Param('id') postId: string,
    @Body('userId') userId: string,
  ) {
    return this.postsService.toggleFavorite(userId, Number(postId));
  }

  @Get('favorites/:userId')
  @ApiOperation({ summary: 'Lấy các bài đăng đã lưu của người dùng' })
  @ApiParam({ name: 'userId', example: '8b4d5f7c-1234-4567-8901-abcdef123456' })
  async getFavorites(@Param('userId') userId: string) {
    return this.postsService.getUserFavorites(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy các bài đăng của người dùng' })
  @ApiParam({ name: 'userId', example: '8b4d5f7c-1234-4567-8901-abcdef123456' })
  async getPostsByUser(@Param('userId') userId: string) {
    return this.postsService.findPostsByUser(userId);
  }

  @Post(':id/delete')
  @ApiOperation({ summary: 'Xóa bài đăng của người dùng' })
  @ApiParam({ name: 'id', example: 123 })
  @ApiBody({ type: ToggleFavoriteDto })
  async deletePost(
    @Param('id') postId: string,
    @Body('userId') userId: string,
  ) {
    return this.postsService.deletePost(Number(postId), userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật bài đăng' })
  @ApiParam({ name: 'id', example: 123 })
  @ApiBody({ type: UpdatePostDto })
  async updatePost(
    @Param('id') id: string,
    @Body() data: UpdatePostDto,
  ) {
    return this.postsService.updatePost(Number(id), data.userId, data);
  }
}