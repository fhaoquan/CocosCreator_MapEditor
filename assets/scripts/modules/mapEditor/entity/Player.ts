import { _decorator, Graphics, Node, UITransform, Vec3 } from 'cc';
import { UIComp } from '../../../framework/ui/UIComp';
import { MapMgr } from '../../base/MapMgr';
import PathFindingAgent from '../../road/PathFindingAgent';
import { BaseUT } from '../../../framework/base/BaseUtil';
const { ccclass, property } = _decorator;

@ccclass('Player')
export class Player extends UIComp {
    @property({ type: Node })
    private sp_player: Node;
    @property({ type: Node })
    private collider: Node;

    private _uiTranstorm: UITransform;
    /** 角色移动速度(1毫秒的移动速度)*/
    public speed: number;
    /**角色当前转向（-1左，1右） */
    private _dir: number;
    /**圆心x */
    private _cx: number;
    /**圆心y */
    private _cy: number;
    /**碰撞器圆心半径 */
    private _cRadius: number;
    protected ctor(): void {
        let self = this;
        self.speed = 2;
        self._uiTranstorm = self.node.getComponent(UITransform);
        self._cx = 0;
        self._cy = 37;
        self._cRadius = 37;
        //绘制圆形碰撞器
        let graphics = self.collider.getComponent(Graphics);
        let fillColor = graphics.fillColor;
        fillColor.fromHEX('00FFFF');
        graphics.fillColor.set(fillColor.r, fillColor.g, fillColor.b, 0.6 * 255);
        graphics.circle(self._cx, self._cy, self._cRadius);
        graphics.fill();
    }

    public moveByJoyStick(radian: number) {
        let self = this;
        let playerPos = self.node.position;
        let cos = Math.cos(radian);
        let sin = Math.sin(radian);
        let toX = playerPos.x + self.speed * cos;
        let toY = playerPos.y + self.speed * sin;
        let pathFindingAgent = PathFindingAgent.inst;
        let mapMgr = MapMgr.inst;
        let cellSize = mapMgr.cellSize;
        let dir = cos > 0 ? 1 : -1;
        let isCanMoveX = true;
        let startX = toX - self._cRadius + self._cx;
        let endX = toX + self._cRadius + self._cx;
        let startY = playerPos.y;
        let endY = playerPos.y + self._cRadius * 2;
        let col = dir == 1 ? mapMgr.pos2Grid(endX, playerPos.y).col : mapMgr.pos2Grid(startX, playerPos.y).col;
        let startRow = Math.floor(startY / cellSize);
        let endRow = Math.ceil(endY / cellSize);
        let circleData = { cx: toX + self._cx, cy: playerPos.y + self._cy, r: self._cRadius };
        for (let i = startRow, len = endRow; i < len; i++) {
            let rectData = { x: col * 20, y: i * 20, w: cellSize, h: cellSize };
            if (!BaseUT.RectCircleColliding(circleData, rectData)) continue;
            if (!pathFindingAgent.isCanMoveTo(col * 20, i * 20)) {
                isCanMoveX = false;
                break;
            }
        }
        if (isCanMoveX) self.node.setPosition(toX, playerPos.y);

        let isCanMoveY = true;
        let row = sin > 0 ? mapMgr.pos2Grid(playerPos.x, endY).row : mapMgr.pos2Grid(playerPos.x, startY).row;
        let startCol = Math.floor(startX / cellSize);
        let endCol = Math.ceil(endX / cellSize);
        for (let j = startCol, len = endCol; j < len; j++) {
            let rectData = { x: j * 20, y: row * 20, w: cellSize, h: cellSize };
            if (!BaseUT.RectCircleColliding(circleData, rectData)) continue;
            if (!pathFindingAgent.isCanMoveTo(j * 20, row * 20)) {
                isCanMoveY = false;
                break;
            }
        }
        if (isCanMoveY) self.node.setPosition(playerPos.x, toY);
        // console.log('cos: ' + cos, 'sin: ' + sin);
        self.setDir(dir);
    }

    public setDir(dir: number) {
        let self = this;
        if (self._dir == dir) return;
        self._dir = dir;
        let scale = self.sp_player.scale;
        self.sp_player.setScale(dir, scale.y);
    }

    /**角色宽度 */
    public get width() {
        return this._uiTranstorm.width;
    }

    /**角色高度 */
    public get height() {
        return this._uiTranstorm.height;
    }
}
